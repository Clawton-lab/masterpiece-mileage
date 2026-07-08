import { describe, it, expect } from "vitest";
import { crowMiles, projCoords, isPlausibleDriving } from "./geo.js";

describe("crowMiles", () => {
  it("returns null for missing/invalid points", () => {
    expect(crowMiles(null, { lat: 1, lng: 1 })).toBe(null);
    expect(crowMiles({ lat: 1, lng: 1 }, undefined)).toBe(null);
    expect(crowMiles({ lat: "x", lng: 1 }, { lat: 1, lng: 1 })).toBe(null);
  });

  it("is zero for identical points", () => {
    expect(crowMiles({ lat: 39.72, lng: -105.21 }, { lat: 39.72, lng: -105.21 }))
      .toBeCloseTo(0, 5);
  });

  it("computes the real Cummings -> Green straight-line (~9.8 mi)", () => {
    // The exact stored project coordinates from production.
    const cummings = { lat: 39.720337250303, lng: -105.216277841624 };
    const green = { lat: 39.579857936353, lng: -105.242913270404 };
    const d = crowMiles(cummings, green);
    expect(d).toBeGreaterThan(9.5);
    expect(d).toBeLessThan(10.1);
  });

  it("is symmetric", () => {
    const a = { lat: 39.72, lng: -105.21 };
    const b = { lat: 39.58, lng: -105.24 };
    expect(crowMiles(a, b)).toBeCloseTo(crowMiles(b, a), 9);
  });
});

describe("projCoords", () => {
  it("returns stored coordinates when present", () => {
    expect(projCoords({ lat: 39.72, lng: -105.21 })).toEqual({ lat: 39.72, lng: -105.21 });
    expect(projCoords({ lat: "39.72", lng: "-105.21" })).toEqual({ lat: 39.72, lng: -105.21 });
  });

  it("returns null for missing, blank, or null-island coordinates", () => {
    expect(projCoords(null)).toBe(null);
    expect(projCoords({})).toBe(null);
    expect(projCoords({ lat: null, lng: null })).toBe(null);
    expect(projCoords({ lat: 0, lng: 0 })).toBe(null);
  });
});

describe("isPlausibleDriving", () => {
  it("accepts anything when the floor is unknown", () => {
    expect(isPlausibleDriving(1, null)).toBe(true);
  });

  it("rejects a distance below the straight-line floor (the 5.8 vs 9.8 bug)", () => {
    // Cummings -> Green: stored 5.8 mi vs a ~9.8 mi straight-line floor.
    expect(isPlausibleDriving(5.8, 9.81)).toBe(false);
  });

  it("accepts a real driving distance at or above the floor", () => {
    expect(isPlausibleDriving(18.2, 9.81)).toBe(true);
    expect(isPlausibleDriving(9.81, 9.81)).toBe(true);
  });

  it("allows small rounding slack just under the floor", () => {
    expect(isPlausibleDriving(9.7, 9.81)).toBe(true); // within 5%
    expect(isPlausibleDriving(5.0, 9.81)).toBe(false); // clearly impossible
  });
});
