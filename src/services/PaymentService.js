const PAYMENT_API_URL = process.env.EXPO_PUBLIC_PAYMENT_API_URL;

export async function createTripCheckout({ driverId, tripId }) {
  if (!PAYMENT_API_URL) {
    throw new Error('Configura EXPO_PUBLIC_PAYMENT_API_URL en el archivo .env.local.');
  }

  const response = await fetch(`${PAYMENT_API_URL}/api/payments/create-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, tripId }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo iniciar el pago.');
  }

  if (!data.checkoutUrl) {
    throw new Error('El servidor no devolvió la dirección de Mercado Pago.');
  }

  return data.checkoutUrl;
}
