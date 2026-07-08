// Geo engine — coordinate helpers used by the mileage calculation.
// Split out so the "is this distance even possible?" logic is testable in
// isolation and can guard against geocoding failures that would otherwise
// silently underpay (or overpay) a driver.

/**
 * Great-circle ("as the crow flies") distance in miles between two {lat,lng}
 * points, via the haversine formula. This is the HARD physical floor for any
 * driving route: a real drive is never shorter than the straight line.
 *
 * We use it to reject a class of geocoding bug where a service (Photon in
 * particular) can't find a specific street address and silently snaps it to a
 * town/city center — producing an impossibly short mileage. Returns null if
 * either point is missing or non-numeric.
 */
export function crowMiles(a, b) {
  if (!a || !b) return null;
  const lat1 = Number(a.lat), lng1 = Number(a.lng);
  const lat2 = Number(b.lat), lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const R = 3958.8; // mean Earth radius, miles
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * A project's stored, verified coordinates — preferred over re-geocoding its
 * address text, because the stored lat/lng were resolved once and don't drift
 * with a flaky geocoder. Returns {lat,lng} or null when coordinates are
 * missing, blank, or the null-island (0,0) placeholder.
 */
export function projCoords(p) {
  const lat = Number(p?.lat), lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Is a proposed driving distance physically possible given the straight-line
 * floor? A real route is always >= the great-circle distance; we allow a small
 * slack (default 5%) only for rounding and minor coordinate imprecision.
 * When `floor` is null (coordinates unknown) we can't judge, so we accept.
 */
export function isPlausibleDriving(miles, floor, slack = 0.95) {
  if (floor == null) return true;
  return Number(miles) >= floor * slack;
}
