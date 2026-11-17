import dotenv from 'dotenv';
import express from 'express';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  paymentMatchesTrip,
  toPaymentStatus,
  verifyWebhookSignature,
} from './paymentSecurity.js';
import { getOptionalCheckoutRedirects } from './paymentConfiguration.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4242);
const paymentApiPublicUrl = process.env.PAYMENT_API_PUBLIC_URL?.replace(/\/+$/, '');
const mercadoPagoApi = 'https://api.mercadopago.com';

app.use(express.json());
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  return next();
});

function getFirestoreDatabase() {
  if (!getApps().length) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Configura GOOGLE_APPLICATION_CREDENTIALS en backend/.env.');
    }
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

function requireMercadoPagoAccessToken() {
  if (!process.env.MP_ACCESS_TOKEN?.startsWith('APP_USR')) {
    throw new Error(
      'MP_ACCESS_TOKEN debe ser un Access Token APP_USR de Credenciales > Prueba de Mercado Pago.'
    );
  }
}

function requireTestConfiguration() {
  requireMercadoPagoAccessToken();
  if (!process.env.MP_WEBHOOK_SECRET) {
    throw new Error('Configura MP_WEBHOOK_SECRET en backend/.env.');
  }
  if (!paymentApiPublicUrl || !paymentApiPublicUrl.startsWith('https://')) {
    throw new Error('PAYMENT_API_PUBLIC_URL debe ser una URL HTTPS pública para Mercado Pago.');
  }
}

function getTripReference(driverId, tripId) {
  if (
    typeof driverId !== 'string'
    || typeof tripId !== 'string'
    || !driverId.trim()
    || !tripId.trim()
    || driverId.includes('/')
    || tripId.includes('/')
    || driverId.length > 128
    || tripId.length > 128
  ) {
    return null;
  }
  return { driverId, tripId };
}

function tripDocument(driverId, tripId) {
  return getFirestoreDatabase()
    .collection('users')
    .doc(driverId)
    .collection('trips')
    .doc(tripId);
}

async function getMercadoPagoFailure(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const causes = Array.isArray(data.cause) ? data.cause : [];
  const codes = [
    ...(typeof data.error === 'string' ? [data.error] : []),
    ...causes.map((cause) => cause?.code),
  ].filter((code) => typeof code === 'string' && /^[a-zA-Z0-9_.-]{1,60}$/.test(code));

  return { status: response.status, codes: [...new Set(codes)] };
}

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/maps/directions', async (request, response) => {
  const { origin, destination } = request.query;
  const validCoordinate = (value) => (
    typeof value === 'string'
    && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value)
    && Number(value.split(',')[0]) >= -90
    && Number(value.split(',')[0]) <= 90
    && Number(value.split(',')[1]) >= -180
    && Number(value.split(',')[1]) <= 180
  );
  if (!validCoordinate(origin) || !validCoordinate(destination)) {
    return response.status(400).json({ message: 'El origen y el destino deben ser coordenadas válidas.' });
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return response.status(503).json({ message: 'Configura GOOGLE_MAPS_API_KEY en backend/.env.' });
  }

  try {
    const [originLatitude, originLongitude] = origin.split(',').map(Number);
    const [destinationLatitude, destinationLongitude] = destination.split(',').map(Number);
    const mapsResponse = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: originLatitude, longitude: originLongitude },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destinationLatitude, longitude: destinationLongitude },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          computeAlternativeRoutes: false,
          languageCode: 'es-CO',
          units: 'METRIC',
        }),
      }
    );
    const routeResponse = await mapsResponse.json();
    const route = routeResponse.routes?.[0];
    const durationSeconds = Number.parseFloat(route?.duration);
    if (
      !mapsResponse.ok
      || !route?.polyline?.encodedPolyline
      || !Number.isFinite(route.distanceMeters)
      || !Number.isFinite(durationSeconds)
    ) {
      console.error('Google Routes API no devolvió una ruta:', mapsResponse.status);
      return response.status(502).json({ message: 'Google Maps no pudo calcular la ruta.' });
    }

    return response.json({
      encodedPolyline: route.polyline.encodedPolyline,
      distanceMeters: route.distanceMeters,
      durationSeconds,
    });
  } catch (error) {
    console.error('Error al consultar Google Routes API:', {
      message: error.message,
      causeCode: error.cause?.code,
      causeMessage: error.cause?.message,
    });
    return response.status(502).json({ message: 'No se pudo consultar Google Maps.' });
  }
});

app.post('/api/payments/create-preference', async (request, response) => {
  try {
    requireMercadoPagoAccessToken();
    const reference = getTripReference(request.body?.driverId, request.body?.tripId);
    if (!reference) {
      return response.status(400).json({ message: 'driverId y tripId son obligatorios.' });
    }

    const tripRef = tripDocument(reference.driverId, reference.tripId);
    const tripSnapshot = await tripRef.get();
    if (!tripSnapshot.exists) {
      return response.status(404).json({ message: 'No se encontró el viaje.' });
    }

    const trip = tripSnapshot.data();
    if (trip.status === 'paid' || trip.paymentStatus === 'Aprobado') {
      return response.status(409).json({ message: 'Este viaje ya tiene un pago aprobado.' });
    }
    if (trip.status !== 'completed' || trip.paymentMethod !== 'mercadopago') {
      return response.status(409).json({ message: 'El viaje no está listo para pagar con Mercado Pago.' });
    }

    if (trip.checkoutUrl && trip.preferenceId && trip.paymentStatus === 'Pendiente') {
      return response.json({
        preferenceId: trip.preferenceId,
        checkoutUrl: trip.checkoutUrl,
      });
    }

    const amount = Math.round(Number(trip.total ?? (trip.fare + (trip.tip || 0))));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return response.status(400).json({ message: 'El monto guardado para el viaje no es válido.' });
    }

    const preferenceResponse = await fetch(`${mercadoPagoApi}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          id: reference.tripId,
          title: 'Viaje UberClone',
          quantity: 1,
          unit_price: amount,
          currency_id: 'COP',
        }],
        external_reference: `${reference.driverId}:${reference.tripId}`,
        metadata: {
          driver_id: reference.driverId,
          trip_id: reference.tripId,
        },
        ...getOptionalCheckoutRedirects({
          publicUrl: paymentApiPublicUrl,
          webhookSecret: process.env.MP_WEBHOOK_SECRET,
          returnUrl: request.body?.returnUrl,
        }),
      }),
    });

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok) {
      console.error('Mercado Pago rechazó la creación de la preferencia:', preference.status);
      return response.status(502).json({ message: 'Mercado Pago no pudo crear el checkout.' });
    }

    const checkoutUrl = preference.sandbox_init_point || preference.init_point;
    if (!preference.id || !checkoutUrl) {
      console.error('Mercado Pago devolvió una preferencia incompleta.');
      return response.status(502).json({ message: 'Mercado Pago devolvió una respuesta incompleta.' });
    }

    await tripRef.update({
      paymentMethod: 'mercadopago',
      preferenceId: String(preference.id),
      checkoutUrl,
      paymentStatus: 'Pendiente',
      paymentUpdatedAt: FieldValue.serverTimestamp(),
    });

    return response.json({
      preferenceId: String(preference.id),
      checkoutUrl,
    });
  } catch (error) {
    console.error('No se pudo crear el checkout:', error.message);
    return response.status(503).json({ message: error.message || 'No se pudo iniciar el pago.' });
  }
});

app.post('/api/payments/verify-return', async (request, response) => {
  try {
    requireMercadoPagoAccessToken();
    const reference = getTripReference(request.body?.driverId, request.body?.tripId);
    const paymentId = request.body?.paymentId;
    if (
      !reference
      || (
        paymentId !== undefined
        && (typeof paymentId !== 'string' || !/^\d{1,32}$/.test(paymentId))
      )
    ) {
      return response.status(400).json({ message: 'La referencia del viaje o el pago no es válida.' });
    }

    const tripRef = tripDocument(reference.driverId, reference.tripId);
    const tripSnapshot = await tripRef.get();
    if (!tripSnapshot.exists) {
      return response.status(404).json({ message: 'No se encontró el viaje.' });
    }

    const trip = tripSnapshot.data();
    if (
      (trip.status !== 'completed' && trip.status !== 'paid')
      || trip.paymentMethod !== 'mercadopago'
    ) {
      return response.status(409).json({ message: 'El viaje no está listo para verificar el pago.' });
    }

    const expectedAmount = Math.round(Number(trip.total ?? (trip.fare + (trip.tip || 0))));
    const expectedPayment = {
      externalReference: `${reference.driverId}:${reference.tripId}`,
      amount: expectedAmount,
    };
    const expectedPreferencePayment = {
      preferenceId: trip.preferenceId,
      amount: expectedAmount,
    };
    let payment;
    let paymentLookupFailure;
    const lookupSummary = {
      paymentSearchResults: 0,
      referenceMatches: 0,
      merchantOrders: 0,
      preferencePayments: 0,
      preferenceMatches: 0,
    };

    if (paymentId) {
      const paymentResponse = await fetch(
        `${mercadoPagoApi}/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        if (paymentMatchesTrip(paymentData, expectedPayment)) payment = paymentData;
      } else {
        paymentLookupFailure = await getMercadoPagoFailure(paymentResponse);
      }
    }

    if (!payment) {
      const searchUrl = `${mercadoPagoApi}/v1/payments/search?${new URLSearchParams({
        external_reference: `${reference.driverId}:${reference.tripId}`,
        sort: 'date_created',
        criteria: 'desc',
        limit: '20',
      })}`;
      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      if (!searchResponse.ok) {
        const failure = await getMercadoPagoFailure(searchResponse);
        console.error('Mercado Pago rechazó la búsqueda del pago:', failure);
        const codes = failure.codes.length ? ` (${failure.codes.join(', ')})` : '';
        return response.status(502).json({
          message: `Mercado Pago respondió HTTP ${failure.status}${codes}.`,
        });
      }

      const searchData = await searchResponse.json();
      const searchResults = Array.isArray(searchData.results) ? searchData.results : [];
      const payments = searchResults
        .filter((item) => paymentMatchesTrip(item, expectedPayment));
      lookupSummary.paymentSearchResults = searchResults.length;
      lookupSummary.referenceMatches = payments.length;
      payment = payments.find((item) => item.status === 'approved') || payments[0];
    }

    let preferenceLookupFailure;
    if (!payment && trip.preferenceId) {
      const ordersUrl = `${mercadoPagoApi}/merchant_orders/search?${new URLSearchParams({
        preference_id: String(trip.preferenceId),
      })}`;
      const ordersResponse = await fetch(ordersUrl, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = Array.isArray(ordersData.elements)
          ? ordersData.elements
          : Array.isArray(ordersData.results) ? ordersData.results : [];
        const paymentIds = [...new Set(
          orders
            .flatMap((order) => (Array.isArray(order.payments) ? order.payments : []))
            .map((item) => String(item.id || item.payment_id || ''))
            .filter((id) => /^\d{1,32}$/.test(id))
        )];
        lookupSummary.merchantOrders = orders.length;
        lookupSummary.preferencePayments = paymentIds.length;
        const preferencePayments = [];

        for (const id of paymentIds) {
          const paymentResponse = await fetch(
            `${mercadoPagoApi}/v1/payments/${encodeURIComponent(id)}`,
            { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
          );
          if (!paymentResponse.ok) {
            preferenceLookupFailure = await getMercadoPagoFailure(paymentResponse);
            continue;
          }

          const paymentData = await paymentResponse.json();
          if (paymentMatchesTrip(paymentData, expectedPreferencePayment)) {
            preferencePayments.push(paymentData);
          }
        }

        lookupSummary.preferenceMatches = preferencePayments.length;
        payment = preferencePayments.find((item) => item.status === 'approved')
          || preferencePayments[0];
      } else {
        preferenceLookupFailure = await getMercadoPagoFailure(ordersResponse);
      }
    }

    if (!payment) {
      console.warn('No se encontró el pago en las búsquedas de Mercado Pago:', lookupSummary);
      if (paymentLookupFailure) {
        console.warn('El ID recibido no permitió consultar el pago; se buscó por viaje:', paymentLookupFailure);
      }
      if (preferenceLookupFailure) {
        console.warn('No se pudo completar la búsqueda del pago por preferencia:', preferenceLookupFailure);
        if (preferenceLookupFailure.status !== 404) {
          const codes = preferenceLookupFailure.codes.length
            ? ` (${preferenceLookupFailure.codes.join(', ')})`
            : '';
          return response.status(502).json({
            message: `Mercado Pago respondió HTTP ${preferenceLookupFailure.status}${codes}.`,
          });
        }
      }
      return response.status(404).json({
        message: 'Mercado Pago aún no encontró un pago asociado a este viaje.',
      });
    }
    if (!paymentMatchesTrip(payment, expectedPayment)) {
      return response.status(409).json({ message: 'El pago no coincide con los datos del viaje.' });
    }

    const paymentStatus = toPaymentStatus(payment.status);
    const update = {
      paymentStatus,
      paymentId: String(payment.id),
      paymentUpdatedAt: FieldValue.serverTimestamp(),
    };
    if (paymentStatus === 'Aprobado') update.status = 'paid';
    await tripRef.update(update);

    return response.json({ paymentStatus, status: update.status || trip.status });
  } catch (error) {
    console.error('No se pudo verificar el pago al regresar de Mercado Pago:', error.message);
    return response.status(503).json({ message: 'No se pudo verificar el pago.' });
  }
});

app.post('/api/payments/webhook', async (request, response) => {
  try {
    requireTestConfiguration();
    const dataId = request.query['data.id'] || request.body?.data?.id;
    const requestId = request.get('x-request-id');
    const signature = request.get('x-signature');
    if (!verifyWebhookSignature({
      dataId,
      requestId,
      signature,
      secret: process.env.MP_WEBHOOK_SECRET,
    })) {
      return response.status(401).json({ message: 'Firma de notificación inválida.' });
    }

    const notificationType = request.query.type || request.body?.type || request.body?.topic;
    if (notificationType && notificationType !== 'payment') {
      return response.sendStatus(200);
    }

    const paymentResponse = await fetch(
      `${mercadoPagoApi}/v1/payments/${encodeURIComponent(String(dataId))}`,
      { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
    );
    if (!paymentResponse.ok) {
      console.error('Mercado Pago no permitió consultar el pago:', paymentResponse.status);
      return response.status(502).json({ message: 'No se pudo verificar el pago en Mercado Pago.' });
    }

    const payment = await paymentResponse.json();
    const [driverId, tripId, ...extraReferenceParts] = String(payment.external_reference || '').split(':');
    const reference = getTripReference(driverId, tripId);
    if (!reference || extraReferenceParts.length > 0) {
      return response.sendStatus(200);
    }

    const tripRef = tripDocument(reference.driverId, reference.tripId);
    const tripSnapshot = await tripRef.get();
    if (!tripSnapshot.exists) return response.sendStatus(200);

    const trip = tripSnapshot.data();
    if (trip.status !== 'completed' && trip.status !== 'paid') {
      return response.sendStatus(200);
    }
    const expectedAmount = Math.round(Number(trip.total ?? (trip.fare + (trip.tip || 0))));
    if (!paymentMatchesTrip(payment, {
      externalReference: `${reference.driverId}:${reference.tripId}`,
      preferenceId: trip.preferenceId,
      amount: expectedAmount,
    })) {
      console.warn('Se ignoró una notificación que no coincide con los datos del viaje.');
      return response.sendStatus(200);
    }

    const paymentStatus = toPaymentStatus(payment.status);
    const update = {
      paymentStatus,
      paymentId: String(payment.id),
      paymentUpdatedAt: FieldValue.serverTimestamp(),
    };
    if (paymentStatus === 'Aprobado') update.status = 'paid';
    await tripRef.update(update);

    return response.sendStatus(200);
  } catch (error) {
    console.error('No se pudo procesar la notificación de pago:', error.message);
    return response.status(503).json({ message: 'No se pudo procesar la notificación.' });
  }
});

app.get('/api/payments/return', (_request, response) => {
  response.type('html').send(
    '<!doctype html><html lang="es"><meta charset="utf-8"><title>Pago recibido</title>'
    + '<body><main><h1>Regresa a UberClone</h1>'
    + '<p>El estado definitivo se actualizará cuando Mercado Pago confirme el pago.</p>'
    + '<a href="uberclone://payment-return">Volver a la app</a></main></body></html>'
  );
});

app.listen(port, '0.0.0.0', () => {
  console.log(`UberClone payment API escuchando en el puerto ${port}.`);
});
