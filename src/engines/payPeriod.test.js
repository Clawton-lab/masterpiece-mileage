import { describe, it, expect } from "vitest";
import { getPayPeriod } from "./payPeriod.js";

// Fixed "now" so the math is deterministic. 2025-04-20T18:00Z == 12:00 MDT
// on Apr 20 in Denver, which falls inside the first biweekly period that
// starts on the anchor 2025-04-14.
const ANCHOR = "2025-04-14";
const NOW = new Date("2025-04-20T18:00:00Z");

describe("getPayPeriod (biweekly)", () => {
  it("returns the period containing 'now'", () => {
    const r = getPayPeriod(null, ANCHOR, "biweekly", "17:00", "America/Denver", 0, NOW);
    expect(r).toEqual({ start: "2025-04-14", end: "2025-04-27" });
  });

  it("shifts back one full period with offset -1", () => {
    const r = getPayPeriod(null, ANCHOR, "biweekly", "17:00", "America/Denver", -1, NOW);
    expect(r).toEqual({ start: "2025-03-31", end: "2025-04-13" });
  });

  it("shifts forward one full period with offset +1", () => {
    const r = getPayPeriod(null, ANCHOR, "biweekly", "17:00", "America/Denver", 1, NOW);
    expect(r).toEqual({ start: "2025-04-28", end: "2025-05-11" });
  });
});

describe("getPayPeriod (period lengths)", () => {
  it("weekly periods span 7 days", () => {
    const r = getPayPeriod(null, ANCHOR, "weekly", "17:00", "America/Denver", 0, NOW);
    // start + 6 days
    expect(r.start).toBe("2025-04-14");
    expect(r.end).toBe("2025-04-20");
  });

  it("biweekly periods span 14 days (end = start + 13)", () => {
    const r = getPayPeriod(null, ANCHOR, "biweekly", "17:00", "America/Denver", 0, NOW);
    expect(r.start).toBe("2025-04-14");
    expect(r.end).toBe("2025-04-27");
  });
});
