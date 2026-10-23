import { describe, expect, it } from "vitest";
import { areaGeometrySchema, buildBoundaryFile, toMultiPolygon } from "./boundary";

const square: [number, number][][] = [
  [
    [-76.5, 3.4],
    [-76.4, 3.4],
    [-76.4, 3.5],
    [-76.5, 3.5],
    [-76.5, 3.4],
  ],
];

const valle = { code: "76", name: "Valle del Cauca", osmRelationId: 1322825 };

function nominatimResponse(overrides: {
  osmId?: number;
  extratags?: Record<string, string> | null;
  geometry?: unknown;
}) {
  return {
    type: "FeatureCollection",
    licence: "Data © OpenStreetMap contributors, ODbL 1.0.",
    features: [
      {
        type: "Feature",
        properties: {
          osm_type: "relation",
          osm_id: overrides.osmId ?? 1322825,
          name: "Valle del Cauca",
          extratags: overrides.extratags === undefined ? { divipola: "76" } : overrides.extratags,
        },
        geometry: overrides.geometry ?? { type: "Polygon", coordinates: square },
      },
    ],
  };
}

describe("areaGeometrySchema", () => {
  it("accepts polygons and multipolygons", () => {
    expect(areaGeometrySchema.safeParse({ type: "Polygon", coordinates: square }).success).toBe(
      true,
    );
    expect(
      areaGeometrySchema.safeParse({ type: "MultiPolygon", coordinates: [square] }).success,
    ).toBe(true);
  });

  it("rejects points and other geometry types", () => {
    expect(areaGeometrySchema.safeParse({ type: "Point", coordinates: [-76.5, 3.4] }).success).toBe(
      false,
    );
  });

  it("rejects unclosed rings", () => {
    const open = [square[0]!.slice(0, 4).concat([[-76.45, 3.45]])];
    expect(areaGeometrySchema.safeParse({ type: "Polygon", coordinates: open }).success).toBe(
      false,
    );
  });

  it("rejects rings with fewer than four positions", () => {
    const tiny = [
      [
        [-76.5, 3.4],
        [-76.4, 3.4],
        [-76.5, 3.4],
      ],
    ];
    expect(areaGeometrySchema.safeParse({ type: "Polygon", coordinates: tiny }).success).toBe(
      false,
    );
  });

  it("rejects coordinates outside WGS84 ranges (e.g. swapped lat/lon)", () => {
    const swapped = [square[0]!.map(([lon, lat]) => [lat!, lon! * 3])];
    expect(areaGeometrySchema.safeParse({ type: "Polygon", coordinates: swapped }).success).toBe(
      false,
    );
  });
});

describe("toMultiPolygon", () => {
  it("wraps a polygon", () => {
    expect(toMultiPolygon({ type: "Polygon", coordinates: square })).toEqual({
      type: "MultiPolygon",
      coordinates: [square],
    });
  });

  it("returns multipolygons unchanged", () => {
    const multi = { type: "MultiPolygon" as const, coordinates: [square, square] };
    expect(toMultiPolygon(multi)).toBe(multi);
  });
});

describe("buildBoundaryFile", () => {
  const retrievedAt = new Date("2026-10-23T14:00:00Z");

  it("builds a file with provenance and a multipolygon geometry", () => {
    const file = buildBoundaryFile(valle, nominatimResponse({}), retrievedAt);
    expect(file.properties).toEqual({
      code: "76",
      name: "Valle del Cauca",
      source: "OpenStreetMap",
      osmRelationId: 1322825,
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      retrievedAt: "2026-10-23",
    });
    expect(file.geometry).toEqual({ type: "MultiPolygon", coordinates: [square] });
  });

  it("rejects a relation whose DIVIPOLA code does not match", () => {
    expect(() =>
      buildBoundaryFile(valle, nominatimResponse({ extratags: { divipola: "19" } }), retrievedAt),
    ).toThrow(/divipola=19, expected 76/);
  });

  it("rejects a relation without DIVIPOLA code", () => {
    expect(() =>
      buildBoundaryFile(valle, nominatimResponse({ extratags: null }), retrievedAt),
    ).toThrow(/divipola=\(missing\)/);
  });

  it("rejects a different OSM relation", () => {
    expect(() => buildBoundaryFile(valle, nominatimResponse({ osmId: 42 }), retrievedAt)).toThrow(
      /Expected OSM relation 1322825, got 42/,
    );
  });

  it("rejects a non-area geometry (unclosed relation)", () => {
    const point = { type: "Point", coordinates: [-76.5, 3.4] };
    expect(() =>
      buildBoundaryFile(valle, nominatimResponse({ geometry: point }), retrievedAt),
    ).toThrow();
  });

  it("rejects responses with no or several features", () => {
    const empty = { type: "FeatureCollection", features: [] };
    expect(() => buildBoundaryFile(valle, empty, retrievedAt)).toThrow();
  });
});
