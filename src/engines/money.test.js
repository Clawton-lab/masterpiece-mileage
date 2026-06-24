import { describe, it, expect } from "vitest";
import { metersToMiles, reimbursement } from "./money.js";

describe("metersToMiles", () => {
  it("converts and rounds to 0.1 mi", () => {
    expect(metersToMiles(1609.34)).toBe(1.0); // ~1 mile
    expect(metersToMiles(10000)).toBe(6.2);
    expect(metersToMiles(0)).toBe(0);
  });

  it("rounds to the nearest tenth", () => {
    // 16093.4m ≈ 10.0 mi
    expect(metersToMiles(16093.4)).toBe(10.0);
    // 8047m ≈ 5.0 mi
    expect(metersToMiles(8047)).toBe(5.0);
  });
});

describe("reimbursement", () => {
  it("multiplies miles by rate and rounds to the cent", () => {
    expect(reimbursement(100, 0.67)).toBe(67);
    expect(reimbursement(10.5, 0.67)).toBe(7.04);
    expect(reimbursement(0, 0.67)).toBe(0);
  });

  it("handles fractional cents by rounding", () => {
    // 3.3 * 0.67 = 2.211 -> 2.21
    expect(reimbursement(3.3, 0.67)).toBe(2.21);
  });
});
