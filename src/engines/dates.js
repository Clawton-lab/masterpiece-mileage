// Date & formatting engine.
// Pure date helpers extracted verbatim from the original App.jsx. Behavior is
// preserved exactly. The only additions are optional `now` parameters on the
// "current time" helpers so they can be tested deterministically — production
// callers pass nothing, so the default (new Date()) keeps behavior identical.

const BUSINESS_TZ = "America/Denver";

/** Format a YYYY-MM-DD string as e.g. "Apr 14" (no year). */
export function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Format a YYYY-MM-DD string as e.g. "Apr 14, 2025" (with year). */
export function fmtDateFull(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Today's calendar date (YYYY-MM-DD) in the business timezone. */
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The current four-digit year. */
export function thisYear(now = new Date()) {
  return now.getFullYear();
}
