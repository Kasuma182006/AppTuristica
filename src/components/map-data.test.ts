import { describe, expect, it } from "vitest";
import type { PlacePoint } from "@/modules/places/types";
import { boundsOf, toFeatureCollection, VALLE_BOUNDS } from "./map-data";

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
      properties: { slug: "a", name: "a", placeType: "cascada", approximate: true },
    });
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
