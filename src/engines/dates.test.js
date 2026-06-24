import { describe, it, expect } from "vitest";
import { fmtDate, fmtDateFull, today, thisYear } from "./dates.js";

describe("fmtDate", () => {
  it("formats YYYY-MM-DD as 'Mon D' with no year", () => {
    expect(fmtDate("2025-04-14")).toBe("Apr 14");
    expect(fmtDate("2025-12-25")).toBe("Dec 25");
  });
});

describe("fmtDateFull", () => {
  it("formats YYYY-MM-DD as 'Mon D, YYYY'", () => {
    expect(fmtDateFull("2025-04-14")).toBe("Apr 14, 2025");
    expect(fmtDateFull("2025-12-25")).toBe("Dec 25, 2025");
  });
});

describe("today", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves the instant in America/Denver", () => {
    // 2025-04-14 18:00 UTC is 12:00 MDT on 2025-04-14 in Denver.
    expect(today(new Date("2025-04-14T18:00:00Z"))).toBe("2025-04-14");
    // 2025-04-14 04:00 UTC is 22:00 MDT on 2025-04-13 in Denver (previous day).
    expect(today(new Date("2025-04-14T04:00:00Z"))).toBe("2025-04-13");
  });
});

describe("thisYear", () => {
  it("returns the four-digit year", () => {
    expect(thisYear(new Date("2023-06-01T12:00:00Z"))).toBe(2023);
  });
});
