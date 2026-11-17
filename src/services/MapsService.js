const API_BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_URL;

function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

export async function getDrivingRoute(origin, destination) {
  if (!API_BASE_URL) {
    throw new Error('Configura EXPO_PUBLIC_PAYMENT_API_URL en el archivo .env.local.');
  }

  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
  });
  const response = await fetch(`${API_BASE_URL}/api/maps/directions?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo obtener la ruta de Google Maps.');
  }
  if (!data.encodedPolyline) {
    throw new Error('Google Maps no devolvió la geometría de la ruta.');
  }

  return {
    coordinates: decodePolyline(data.encodedPolyline),
    distanceKm: data.distanceMeters / 1000,
    durationMin: Math.ceil(data.durationSeconds / 60),
  };
}
