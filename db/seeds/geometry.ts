import { sql, type SQL } from "drizzle-orm";
import type { MultiPolygonGeometry } from "./boundary";

/**
 * SQL expression for a `geometry(MultiPolygon, 4326)` value built from GeoJSON.
 * ST_MakeValid repairs self-intersections (it is a no-op on valid input) and
 * ST_CollectionExtract(…, 3) keeps only the polygons it may return.
 */
export function multiPolygonFromGeoJson(geometry: MultiPolygonGeometry): SQL {
  const geoJson = JSON.stringify(geometry);
  return sql`ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}::text), 4326)), 3))`;
}
