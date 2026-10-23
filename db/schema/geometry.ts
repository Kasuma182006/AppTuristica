import { customType } from "drizzle-orm/pg-core";

// PostGIS lives in the `extensions` schema, which is on Supabase's default search_path.
// Reads return the raw EWKB hex string; queries that need shapes use ST_AsGeoJSON explicitly.
// Writes go through SQL expressions (see db/seeds/geometry.ts), never raw values.
export const multiPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(MultiPolygon, 4326)",
});
