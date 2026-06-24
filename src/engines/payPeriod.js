// Pay-period engine.
// Given the configured anchor date, frequency, cutoff time, timezone, and an
// offset, returns the {start, end} calendar dates (YYYY-MM-DD) of the target
// pay period (biweekly by default; also supports weekly and monthly).
//
// Extracted verbatim from the original App.jsx. The ONLY change is that the
// current instant is now an injectable parameter (`now`, default `new Date()`)
// so the math can be tested deterministically — production behavior is identical.
//
// NOTE (pre-existing quirk, intentionally preserved): the first parameter
// `date` is accepted but NOT used by the calculation. The original ignored it
// too and derived the period from the current instant formatted in `tz` — that
// is what carries the time-of-day cutoff. Changing it would alter behavior, so
// it is left exactly as-is.
export function getPayPeriod(
  date,
  anchor,
  freq = "biweekly",
  time = "12:00",
  tz = "America/Denver",
  offset = 0,
  now = new Date()
) {
  const [hh, mm] = time.split(":").map(Number);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  const nH = +p.hour === 24 ? 0 : +p.hour;
  const [aY, aM, aD] = anchor.split("-").map(Number);
  const aMin = Date.UTC(aY, aM - 1, aD, hh, mm) / 60000;
  const nMin = Date.UTC(+p.year, +p.month - 1, +p.day, nH, +p.minute) / 60000;
  const pd = freq === "weekly" ? 7 : freq === "monthly" ? 30 : 14;
  const pm = pd * 1440;
  const idx = Math.floor((nMin - aMin) / pm) + offset;
  const sMin = aMin + idx * pm;
  const eMin = sMin + pm - 1440;
  const fmt2 = (m) => {
    const d = new Date(m * 60000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  };
  return { start: fmt2(sMin), end: fmt2(eMin) };
}
