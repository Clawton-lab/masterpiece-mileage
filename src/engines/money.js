// Money & unit-conversion engine.
// The single source of truth for how miles and reimbursement dollars are
// computed and rounded across the app. Extracted verbatim from inline
// expressions in the original App.jsx — results are byte-for-byte identical.

/**
 * Convert a distance in meters (as returned by OSRM) to miles, rounded to the
 * nearest 0.1 mile. Mirrors the original: Math.round(m * 0.000621371 * 10) / 10.
 */
export function metersToMiles(meters) {
  return Math.round(meters * 0.000621371 * 10) / 10;
}

/**
 * Compute a reimbursement amount in dollars from miles and an IRS rate,
 * rounded to the cent. Mirrors the original: Math.round(miles * rate * 100) / 100.
 */
export function reimbursement(miles, rate) {
  return Math.round(miles * rate * 100) / 100;
}
