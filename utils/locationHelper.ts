// Haversine Distance Calculator
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // earth radius (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if location is within range (meters)
export function isWithinRange(lat1: number, lon1: number, lat2: number, lon2: number, rangeMeters: number) {
  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  return (distanceKm * 1000) <= rangeMeters;
}
