const PAYMENT_API_URL = process.env.EXPO_PUBLIC_PAYMENT_API_URL;

async function postPaymentRequest(path, body) {
  if (!PAYMENT_API_URL) {
    throw new Error('Configura EXPO_PUBLIC_PAYMENT_API_URL en el archivo .env.local.');
  }

  const response = await fetch(`${PAYMENT_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo procesar la solicitud de pago.');
  }

  return data;
}

export async function createTripCheckout({ driverId, tripId, returnUrl }) {
  const data = await postPaymentRequest('/api/payments/create-preference', {
    driverId,
    tripId,
    returnUrl,
  });

  if (!data.checkoutUrl) {
    throw new Error('El servidor no devolvió la dirección de Mercado Pago.');
  }

  return data.checkoutUrl;
}

export async function verifyTripPayment({ driverId, tripId, paymentId }) {
  return postPaymentRequest('/api/payments/verify-return', {
    driverId,
    tripId,
    paymentId,
  });
}
