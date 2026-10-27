import { describe, expect, it } from "vitest";
import type { PlacePoint } from "@/modules/places/types";
import {
  boundsOf,
  FRAGILE_AREA_RADIUS,
  MAX_SUMMARY_SITES,
  pixelsPerMeter,
  sitesAt,
  toFeatureCollection,
  VALLE_BOUNDS,
  type MapPointProperties,
} from "./map-data";

const point = (slug: string, lat: number, lng: number, approximate = false): PlacePoint => ({
  slug,
  name: slug,
  municipality: "Dagua",
  placeType: { slug: "cascada", name: "Cascada" },
  location: { lat, lng, approximate, radiusM: approximate ? 2000 : null },
});

describe("toFeatureCollection", () => {
  it("puts longitude first, as GeoJSON requires", () => {
    const collection = toFeatureCollection([point("a", 3.6, -76.7, true)]);
    expect(collection.features[0]).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7, 3.6] },
      properties: {
        slug: "a",
        name: "a",
        municipality: "Dagua",
        placeType: "Cascada",
        approximate: true,
      },
    });
  });
});

describe("FRAGILE_AREA_RADIUS", () => {
  it("draws the 2 km area at real size: about 26 px at zoom 10 near the equator", () => {
    expect(2000 * pixelsPerMeter(10, 4)).toBeCloseTo(26.2, 1);
    expect(Number(FRAGILE_AREA_RADIUS[6])).toBeCloseTo(26.2, 1);
  });

  it("keeps a visible minimum when zoomed out", () => {
    expect(FRAGILE_AREA_RADIUS[4]).toBe(7);
  });
});

describe("sitesAt", () => {
  const site = (slug: string): { properties: MapPointProperties } => ({
    properties: { slug, name: slug, municipality: "Buga", placeType: "Lago", approximate: true },
  });

  it("lists each site once", () => {
    expect(sitesAt([site("a"), site("b"), site("a")])).toEqual({
      shown: [site("a").properties, site("b").properties],
      more: 0,
    });
  });

  it("counts the sites beyond the limit", () => {
    const many = Array.from({ length: MAX_SUMMARY_SITES + 3 }, (_, i) => site("s" + i));
    expect(sitesAt(many)).toMatchObject({ more: 3 });
    expect(sitesAt(many).shown).toHaveLength(MAX_SUMMARY_SITES);
  });
});

describe("boundsOf", () => {
  it("covers every site", () => {
    expect(boundsOf([point("a", 3.6, -76.7), point("b", 4.1, -76.2)])).toEqual([
      -76.7, 3.6, -76.2, 4.1,
    ]);
  });

  it("leaves faraway sites out of the first view", () => {
    const mainland = [point("a", 3.6, -76.7), point("b", 4.1, -76.2), point("c", 3.9, -76.5)];
    const malpelo = point("malpelo", 4.0, -81.6);
    expect(boundsOf([...mainland, malpelo])).toEqual([-76.7, 3.6, -76.2, 4.1]);
  });

  it("frames a faraway site when it is all there is", () => {
    expect(boundsOf([point("malpelo", 4.0, -81.6)])).toEqual([-81.6, 4.0, -81.6, 4.0]);
  });

  it("falls back to the whole Valle without sites", () => {
    expect(boundsOf([])).toBe(VALLE_BOUNDS);
  });
});
