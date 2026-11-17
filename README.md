# UberClone

Aplicación React Native / Expo para el flujo del conductor. La integración de
pagos usa Mercado Pago Checkout Pro en modo de prueba; el backend crea el
checkout, recibe la notificación de Mercado Pago y actualiza el viaje en
Firestore.

## Estructura de Mercado Pago

```text
backend/
  server.js                 API, creación de preferencias y webhook
  paymentSecurity.js        Validación de firma y estados del webhook
  .env                      Variables privadas del backend, excluidas de Git
src/
  services/PaymentService.js Llamada de la app al backend para cobrar
  services/MapsService.js   Consulta de rutas de Google Routes API al backend
  services/UserService.js   Viajes, ubicación y sincronización de pagos
  screens/trips/
    ActiveTripScreen.js     Ruta y simulación de movimiento en 10 segundos
    TripHistoryScreen.js    Historial paginado, filtros y detalle del viaje
    TripSummaryScreen.js    Botón de checkout y resumen del pago
.env.local                  URL del backend que usa Expo
```

## Configuración de prueba

1. En Mercado Pago Developers, crea un usuario de prueba vendedor y otro
   comprador. Usa las **credenciales de prueba** del vendedor; el access token
   de esta integración empieza con `APP_USR`; verifica que el selector de
   ambiente diga **Prueba**, porque las credenciales de producción también
   pueden usar ese prefijo. Para pagar, inicia sesión en Checkout Pro con el
   comprador de prueba y usa un medio de pago de prueba de Mercado Pago.
2. Abre `backend/.env` y completa las variables que tengas disponibles:
   - `MP_ACCESS_TOKEN`: access token de prueba del vendedor.
   - `MP_WEBHOOK_SECRET`: clave de firma de Webhooks; solo hace falta para
     confirmar automáticamente los pagos en la app.
   - `PAYMENT_API_PUBLIC_URL`: URL HTTPS pública del backend, sin `/` al final;
     solo hace falta para configurar retornos y notificaciones automáticas.
   - `GOOGLE_APPLICATION_CREDENTIALS`: ruta absoluta a un JSON de cuenta de
     servicio de Firebase Admin. Guarda ese JSON fuera del repositorio.
   - `GOOGLE_MAPS_API_KEY`: clave de servidor con Routes API habilitada.
     No la pongas en `EXPO_PUBLIC_*`.
3. Para probar únicamente la apertura y el checkout de prueba, basta con
   `MP_ACCESS_TOKEN`; deja `MP_WEBHOOK_SECRET` y `PAYMENT_API_PUBLIC_URL` vacíos.
   La app configura una URL de retorno profunda y, al regresar de Checkout Pro,
   el backend consulta a Mercado Pago y valida la referencia, preferencia, monto
   y moneda antes de actualizarlo. Expo Go usa un enlace `exp://`; una app
   instalada usa el esquema `uberclone://`.
   Para usar además un webhook, expón el puerto 4242 con una URL HTTPS pública,
   configúrala en `PAYMENT_API_PUBLIC_URL`, registra
   `/api/payments/webhook` en Mercado Pago y guarda la clave de firma en
   `MP_WEBHOOK_SECRET`.
4. Configura `EXPO_PUBLIC_PAYMENT_API_URL` en `.env.local` en la raíz con la
   dirección que alcanza el teléfono:
   - Expo Web / simulador iOS: `http://localhost:4242`
   - Emulador Android: `http://10.0.2.2:4242`
   - Teléfono con Expo Go: `http://<IP-LAN-del-computador>:4242` (ambos equipos
     en la misma red).
   Expo lee `.env.local` al iniciar; después de cambiarlo, detén y reinicia
   Expo con `npx expo start -c`.
5. Instala y ejecuta el backend desde `backend/`:

   ```sh
   npm install
   npm start
   ```

6. Desde la raíz, inicia la app:

   ```sh
   npm install
   npx expo start
   ```

## Google Routes API y seguimiento

1. En Google Cloud Console, habilita **Routes API** y configura la
   facturación/cupo del proyecto. Restringe `GOOGLE_MAPS_API_KEY` a esa API y,
   si es posible, a la IP de salida del servidor. La clave permanece en
   `backend/.env`; la app pide la ruta al endpoint `/api/maps/directions`, que
   consulta `routes.googleapis.com/directions/v2:computeRoutes`.
   La solicitud usa `TRAFFIC_UNAWARE` para la SKU Essentials, cuyo precio
   publicado incluye un límite mensual gratuito de 10.000 solicitudes por
   cuenta de facturación. Las solicitudes que excedan ese límite se cobran;
   revisa la [tabla vigente de precios de Routes API](https://developers.google.com/maps/billing-and-pricing/pricing).
2. Al iniciar cada etapa del viaje se consulta la ruta una vez: ubicación del
   conductor → recogida y recogida → destino. La ruta se dibuja sobre el mapa.
   El GPS de `expo-location` ya actualiza la ubicación del conductor en
   Firestore mientras está Disponible; no se llama a Directions por cada
   movimiento.
3. Las solicitudes actuales son simuladas. Al tocar **Pasajero a bordo**, el
   marcador recorre la geometría devuelta por Routes API en 10 segundos para
   demostrar el flujo. Es una simulación local de la pantalla; no sustituye al
   GPS real. Los viajes guardan la ruta para volver a mostrarla en el detalle.

La API Directions antigua dejó de estar disponible para habilitar en proyectos
Google Cloud nuevos desde octubre de 2026; este backend usa Routes API.
Consulta [los pasos oficiales para crear la clave](https://developers.google.com/maps/documentation/routes/get-api-key)
y el [formato de Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions).

## Historial (punto 6)

La pestaña **Historial** consulta viajes por páginas de 20 y permite filtrar
por Hoy, Semana, Mes, rango de fechas y método de pago. Al abrir un viaje se
muestra el mapa de la ruta, duración, distancia, tarifa, comisión, propina,
ganancia neta, estado de pago y calificación cuando exista. Se conserva el
resumen de ganancias en su pestaña independiente.

## Flujo de pago

1. La app guarda el viaje completado en
   `users/{driverId}/trips/{tripId}`. El importe se toma de ese documento en el
   backend; no se acepta un monto enviado por el móvil.
2. El conductor elige **Pagar con Mercado Pago**. La app solo envía `driverId`
   y `tripId`, más su enlace profundo de retorno, y abre Checkout Pro.
3. El comprador de prueba completa el checkout con medios de pago de prueba.
4. Al volver del checkout, la app envía al backend el ID de pago recibido en el
   enlace de retorno. El backend consulta el pago directamente a Mercado Pago y
   comprueba referencia, preferencia, monto y moneda antes de guardar
   `paymentStatus`, `paymentId` y `status: paid` en Firestore. El webhook firmado
   sigue disponible como alternativa.
5. La pantalla de resumen escucha el documento del viaje en tiempo real. Un
   pago rechazado queda como rechazado y permite iniciar otro intento; no se
   marca manualmente como aprobado desde la app.
6. Para efectivo, el conductor confirma el cobro desde el resumen y el viaje
   queda con estado `paid`.

El access token, la clave de firma y la cuenta de servicio son solo del backend.
No copies esos valores en archivos del móvil, repositorio, AsyncStorage o
`EXPO_PUBLIC_*`. `backend/.env` y `.env.local` están excluidos de Git.
`.env.local` contiene únicamente la URL del backend para Expo, no credenciales.

Este flujo es para la demo de clase. Antes de publicar, protege los endpoints
con autenticación Firebase (el prototipo actual no inicia sesión con Firebase
Auth) y define reglas de Firestore que limiten las lecturas/escrituras al dueño
del viaje.
