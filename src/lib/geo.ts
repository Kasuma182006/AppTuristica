import type { LngLat } from "@db/schema/geometry";

/** Side of the grid cells fragile sites are snapped to: 0.02° ≈ 2.2 km in Colombia. */
export const APPROX_GRID_DEGREES = 0.02;

/**
 * Radius of the area drawn around an approximate location. It covers the whole cell (half its
 * diagonal is ~1.6 km), so the site is always inside the area.
 */
export const APPROX_RADIUS_M = 2000;

/** Sites closer than this, with similar names, may be the same place (HU-26, HU-81). */
export const DUPLICATE_DISTANCE_M = 200;

const EARTH_RADIUS_M = 6_371_000;

/** Distance in meters between two points. */
export function distanceM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** 6 decimals ≈ 0.1 m: more precision is noise. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function cellCenter(value: number): number {
  return roundCoordinate((Math.floor(value / APPROX_GRID_DEGREES) + 0.5) * APPROX_GRID_DEGREES);
}

/**
 * Approximate location of a fragile site (HU-39): the center of its ~2 km grid cell. Fixed for
 * a given point, so repeated requests cannot be averaged back to the exact location.
 */
export function approximateLocation({ lng, lat }: LngLat): LngLat {
  return { lng: cellCenter(lng), lat: cellCenter(lat) };
}
