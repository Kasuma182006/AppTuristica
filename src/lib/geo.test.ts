import { describe, expect, it } from "vitest";
import { APPROX_RADIUS_M, approximateLocation, roundCoordinate } from "./geo";

/** Haversine distance in meters. */
function distanceM(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

describe("approximateLocation", () => {
  it("snaps a point to the center of its 0.02° cell", () => {
    expect(approximateLocation({ lat: 3.45123, lng: -76.60871 })).toEqual({
      lat: 3.45,
      lng: -76.61,
    });
  });

  it("gives every point of a cell the same location", () => {
    const a = approximateLocation({ lat: 3.4401, lng: -76.6199 });
    const b = approximateLocation({ lat: 3.4599, lng: -76.6001 });

    expect(a).toEqual(b);
  });

  it("is stable: the same point always gives the same result", () => {
    const point = { lat: 4.0912345, lng: -76.1987654 };

    expect(approximateLocation(point)).toEqual(approximateLocation(point));
  });

  it("never returns the exact point", () => {
    const point = { lat: 3.612345, lng: -76.698765 };
    const approx = approximateLocation(point);

    expect(approx.lat).not.toBe(point.lat);
    expect(approx.lng).not.toBe(point.lng);
  });

  it("keeps every site inside the drawn area, across the Valle del Cauca", () => {
    for (let lat = 3.0; lat <= 5.0; lat += 0.0037) {
      for (let lng = -77.6; lng <= -75.7; lng += 0.0041) {
        const point = { lat, lng };
        expect(distanceM(point, approximateLocation(point))).toBeLessThan(APPROX_RADIUS_M);
      }
    }
  });

  it("returns clean decimals", () => {
    expect(approximateLocation({ lat: 4.0912345, lng: -76.1987654 })).toEqual({
      lat: 4.09,
      lng: -76.19,
    });
  });
});

describe("roundCoordinate", () => {
  it("rounds to 6 decimals", () => {
    expect(roundCoordinate(3.6123456789)).toBe(3.612346);
    expect(roundCoordinate(-76.6987654321)).toBe(-76.698765);
  });
});
