import { z } from "zod";

// GeoJSON boundaries (RFC 7946, WGS84 lon/lat) used to seed departments and, later, places.

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)], z.number());

const linearRing = z
  .array(position)
  .min(4, "a linear ring needs at least 4 positions")
  .refine((ring) => {
    const first = ring[0];
    const last = ring.at(-1);
    return (
      first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1]
    );
  }, "a linear ring must be closed (first position equals last)");

const polygonCoordinates = z.array(linearRing).min(1);

export const polygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinates,
});

export const multiPolygonGeometrySchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoordinates).min(1),
});

export const areaGeometrySchema = z.discriminatedUnion("type", [
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

export type AreaGeometry = z.infer<typeof areaGeometrySchema>;
export type MultiPolygonGeometry = z.infer<typeof multiPolygonGeometrySchema>;

export function toMultiPolygon(geometry: AreaGeometry): MultiPolygonGeometry {
  return geometry.type === "MultiPolygon"
    ? geometry
    : { type: "MultiPolygon", coordinates: [geometry.coordinates] };
}

// Committed boundary file: one GeoJSON Feature per area, with provenance for ODbL attribution.
export const boundaryFileSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    code: z.string().regex(/^[0-9]+$/),
    name: z.string().min(1),
    source: z.literal("OpenStreetMap"),
    osmRelationId: z.number().int().positive(),
    license: z.literal("ODbL-1.0"),
    attribution: z.literal("© OpenStreetMap contributors"),
    retrievedAt: z.iso.date(),
  }),
  geometry: multiPolygonGeometrySchema,
});

export type BoundaryFile = z.infer<typeof boundaryFileSchema>;

// Subset of a Nominatim `/lookup?format=geojson&extratags=1&polygon_geojson=1` response.
export const nominatimLookupSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        properties: z.object({
          osm_type: z.literal("relation"),
          osm_id: z.number().int().positive(),
          name: z.string().min(1),
          extratags: z.record(z.string(), z.string()).nullish(),
        }),
        // Nominatim falls back to a point for unclosed relations; reject anything that is not an area.
        geometry: areaGeometrySchema,
      }),
    )
    .length(1, "expected exactly one OSM relation"),
});

export interface BoundarySource {
  code: string;
  name: string;
  osmRelationId: number;
}

/** Turns a Nominatim lookup into a boundary file, checking it is the expected DIVIPOLA area. */
export function buildBoundaryFile(
  source: BoundarySource,
  nominatimResponse: unknown,
  retrievedAt: Date,
): BoundaryFile {
  const [feature] = nominatimLookupSchema.parse(nominatimResponse).features;
  if (!feature) throw new Error("Nominatim returned no features");

  if (feature.properties.osm_id !== source.osmRelationId) {
    throw new Error(
      `Expected OSM relation ${source.osmRelationId}, got ${feature.properties.osm_id}`,
    );
  }
  const divipola = feature.properties.extratags?.divipola;
  if (divipola !== source.code) {
    throw new Error(
      `OSM relation ${source.osmRelationId} has divipola=${divipola ?? "(missing)"}, expected ${source.code}`,
    );
  }

  return {
    type: "Feature",
    properties: {
      code: source.code,
      name: source.name,
      source: "OpenStreetMap",
      osmRelationId: source.osmRelationId,
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      retrievedAt: retrievedAt.toISOString().slice(0, 10),
    },
    geometry: toMultiPolygon(feature.geometry),
  };
}
