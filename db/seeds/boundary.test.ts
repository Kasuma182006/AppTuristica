import { describe, expect, it } from "vitest";
import {
  areaGeometrySchema,
  buildBoundaryCollection,
  buildBoundaryFeature,
  toMultiPolygon,
} from "./boundary";

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
const cali = { code: "76001", name: "Cali", osmRelationId: 1320707 };
const aguila = { code: "76243", name: "El Águila", osmRelationId: 1473586 };

function nominatimFeature(overrides: {
  osmId?: number;
  name?: string;
  extratags?: Record<string, string> | null;
  geometry?: unknown;
}) {
  return {
    type: "Feature",
    properties: {
      osm_type: "relation",
      osm_id: overrides.osmId ?? valle.osmRelationId,
      name: overrides.name ?? valle.name,
      extratags: overrides.extratags === undefined ? { divipola: "76" } : overrides.extratags,
    },
    geometry: overrides.geometry ?? { type: "Polygon", coordinates: square },
  };
}

function nominatimResponse(...features: ReturnType<typeof nominatimFeature>[]) {
  return {
    type: "FeatureCollection",
    licence: "Data © OpenStreetMap contributors, ODbL 1.0.",
    features,
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

describe("buildBoundaryFeature", () => {
  const retrievedAt = new Date("2026-10-23T14:00:00Z");

  it("builds a feature with provenance and a multipolygon geometry", () => {
    const feature = buildBoundaryFeature(
      valle,
      nominatimResponse(nominatimFeature({})),
      retrievedAt,
    );
    expect(feature.properties).toEqual({
      code: "76",
      name: "Valle del Cauca",
      source: "OpenStreetMap",
      osmRelationId: 1322825,
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      retrievedAt: "2026-10-23",
    });
    expect(feature.geometry).toEqual({ type: "MultiPolygon", coordinates: [square] });
  });

  it("rejects a relation whose DIVIPOLA code does not match", () => {
    const response = nominatimResponse(nominatimFeature({ extratags: { divipola: "19" } }));
    expect(() => buildBoundaryFeature(valle, response, retrievedAt)).toThrow(
      /divipola=19, expected 76/,
    );
  });

  it("accepts a relation without DIVIPOLA code when the name matches (ignoring accents)", () => {
    const response = nominatimResponse(
      nominatimFeature({ osmId: aguila.osmRelationId, name: "El Aguila", extratags: null }),
    );
    expect(buildBoundaryFeature(aguila, response, retrievedAt).properties.name).toBe("El Águila");
  });

  it("rejects a relation without DIVIPOLA code whose name differs", () => {
    const response = nominatimResponse(nominatimFeature({ name: "Cauca", extratags: {} }));
    expect(() => buildBoundaryFeature(valle, response, retrievedAt)).toThrow(
      /no divipola tag and its name "Cauca" is not "Valle del Cauca"/,
    );
  });

  it("rejects a different OSM relation", () => {
    const response = nominatimResponse(nominatimFeature({ osmId: 42 }));
    expect(() => buildBoundaryFeature(valle, response, retrievedAt)).toThrow(
      /Expected OSM relation 1322825, got 42/,
    );
  });

  it("rejects a non-area geometry (unclosed relation)", () => {
    const point = { type: "Point", coordinates: [-76.5, 3.4] };
    const response = nominatimResponse(nominatimFeature({ geometry: point }));
    expect(() => buildBoundaryFeature(valle, response, retrievedAt)).toThrow();
  });

  it("rejects responses with no or several features", () => {
    expect(() => buildBoundaryFeature(valle, nominatimResponse(), retrievedAt)).toThrow(
      /exactly one OSM relation, got 0/,
    );
    const two = nominatimResponse(nominatimFeature({}), nominatimFeature({}));
    expect(() => buildBoundaryFeature(valle, two, retrievedAt)).toThrow(/got 2/);
  });
});

describe("buildBoundaryCollection", () => {
  const retrievedAt = new Date("2026-10-23T14:00:00Z");
  const caliFeature = nominatimFeature({
    osmId: cali.osmRelationId,
    name: "Cali",
    extratags: { divipola: "76001" },
  });
  const aguilaFeature = nominatimFeature({
    osmId: aguila.osmRelationId,
    name: "El Águila",
    extratags: { divipola: "76243" },
  });

  it("merges several responses in the order of the sources", () => {
    const collection = buildBoundaryCollection(
      [cali, aguila],
      [nominatimResponse(aguilaFeature), nominatimResponse(caliFeature)],
      retrievedAt,
    );
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features.map((f) => f.properties.code)).toEqual(["76001", "76243"]);
  });

  it("rejects missing relations", () => {
    expect(() =>
      buildBoundaryCollection([cali, aguila], [nominatimResponse(caliFeature)], retrievedAt),
    ).toThrow(/no area for 76243/);
  });

  it("rejects unexpected relations", () => {
    expect(() =>
      buildBoundaryCollection([cali], [nominatimResponse(caliFeature, aguilaFeature)], retrievedAt),
    ).toThrow(/Unexpected OSM relations: 1473586/);
  });

  it("checks the identity of every relation", () => {
    const wrongCode = nominatimFeature({
      osmId: cali.osmRelationId,
      name: "Cali",
      extratags: { divipola: "76002" },
    });
    expect(() =>
      buildBoundaryCollection([cali], [nominatimResponse(wrongCode)], retrievedAt),
    ).toThrow(/divipola=76002, expected 76001/);
  });
});
