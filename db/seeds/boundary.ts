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

// Committed boundary feature: one GeoJSON Feature per area, with provenance for ODbL attribution.
export const boundaryFeatureSchema = z.object({
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

export type BoundaryFeature = z.infer<typeof boundaryFeatureSchema>;

// Committed file holding several areas (e.g. every municipality of a department).
export const boundaryCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(boundaryFeatureSchema).min(1),
});

export type BoundaryCollection = z.infer<typeof boundaryCollectionSchema>;

const nominatimFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    osm_type: z.literal("relation"),
    osm_id: z.number().int().positive(),
    name: z.string().min(1),
    extratags: z.record(z.string(), z.string()).nullish(),
  }),
  // Nominatim falls back to a point for unclosed relations; reject anything that is not an area.
  geometry: areaGeometrySchema,
});

type NominatimFeature = z.infer<typeof nominatimFeatureSchema>;

// Subset of a Nominatim `/lookup?format=geojson&extratags=1&polygon_geojson=1` response.
export const nominatimLookupSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(nominatimFeatureSchema),
});

export interface BoundarySource {
  code: string;
  name: string;
  osmRelationId: number;
}

/** Case- and accent-insensitive comparison key ("El Águila" → "el aguila"). */
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Checks the OSM relation is the expected DIVIPOLA area. Its `divipola` tag must match when present;
 * some relations lack it, and then the OSM name must match the configured one.
 */
function checkIdentity(source: BoundarySource, feature: NominatimFeature): void {
  const { osm_id: osmId, name, extratags } = feature.properties;
  if (osmId !== source.osmRelationId) {
    throw new Error(`Expected OSM relation ${source.osmRelationId}, got ${osmId}`);
  }
  const divipola = extratags?.divipola;
  if (divipola !== undefined && divipola !== source.code) {
    throw new Error(`OSM relation ${osmId} has divipola=${divipola}, expected ${source.code}`);
  }
  if (divipola === undefined && nameKey(name) !== nameKey(source.name)) {
    throw new Error(
      `OSM relation ${osmId} has no divipola tag and its name "${name}" is not "${source.name}"`,
    );
  }
}

function toBoundaryFeature(
  source: BoundarySource,
  feature: NominatimFeature,
  retrievedAt: Date,
): BoundaryFeature {
  checkIdentity(source, feature);
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

/** Turns a Nominatim lookup of one relation into a boundary feature. */
export function buildBoundaryFeature(
  source: BoundarySource,
  nominatimResponse: unknown,
  retrievedAt: Date,
): BoundaryFeature {
  const { features } = nominatimLookupSchema.parse(nominatimResponse);
  const [feature] = features;
  if (!feature || features.length !== 1) {
    throw new Error(`Expected exactly one OSM relation, got ${features.length}`);
  }
  return toBoundaryFeature(source, feature, retrievedAt);
}

/** Turns Nominatim lookups of several relations into a collection, in the order of `sources`. */
export function buildBoundaryCollection(
  sources: readonly BoundarySource[],
  nominatimResponses: readonly unknown[],
  retrievedAt: Date,
): BoundaryCollection {
  const byOsmId = new Map<number, NominatimFeature>();
  for (const response of nominatimResponses) {
    for (const feature of nominatimLookupSchema.parse(response).features) {
      byOsmId.set(feature.properties.osm_id, feature);
    }
  }

  const expected = new Set(sources.map((s) => s.osmRelationId));
  const extra = [...byOsmId.keys()].filter((id) => !expected.has(id));
  if (extra.length > 0) throw new Error(`Unexpected OSM relations: ${extra.join(", ")}`);

  const features: BoundaryFeature[] = [];
  const missing: string[] = [];
  for (const source of sources) {
    const feature = byOsmId.get(source.osmRelationId);
    if (feature) features.push(toBoundaryFeature(source, feature, retrievedAt));
    else missing.push(source.code);
  }
  if (missing.length > 0) throw new Error(`Nominatim returned no area for ${missing.join(", ")}`);

  return { type: "FeatureCollection", features };
}
