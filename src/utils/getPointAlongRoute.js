function distanceBetween(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDifference = radians(second.latitude - first.latitude);
  const longitudeDifference = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const value = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude)
    * Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function getPointAlongRoute(coordinates, progress) {
  if (!coordinates.length) return null;
  if (coordinates.length === 1 || progress >= 1) return coordinates[coordinates.length - 1];
  if (progress <= 0) return coordinates[0];

  const segmentDistances = coordinates.slice(1).map((point, index) => (
    distanceBetween(coordinates[index], point)
  ));
  const routeDistance = segmentDistances.reduce((total, distance) => total + distance, 0);
  let distanceTravelled = routeDistance * progress;

  for (let index = 0; index < segmentDistances.length; index += 1) {
    const segmentDistance = segmentDistances[index];
    if (distanceTravelled <= segmentDistance) {
      const ratio = segmentDistance ? distanceTravelled / segmentDistance : 0;
      return {
        latitude: coordinates[index].latitude
          + (coordinates[index + 1].latitude - coordinates[index].latitude) * ratio,
        longitude: coordinates[index].longitude
          + (coordinates[index + 1].longitude - coordinates[index].longitude) * ratio,
      };
    }
    distanceTravelled -= segmentDistance;
  }

  return coordinates[coordinates.length - 1];
}
