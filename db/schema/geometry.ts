import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

// PostGIS lives in the `extensions` schema, which is on Supabase's default search_path.

// Reads return the raw EWKB hex string; queries that need shapes use ST_AsGeoJSON explicitly.
// Writes go through SQL expressions (see db/seeds/geometry.ts), never raw values.
export const multiPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(MultiPolygon, 4326)",
});

/** WGS84 position. */
export interface LngLat {
  lng: number;
  lat: number;
}

const EWKB_SRID_FLAG = 0x20000000;
const WKB_POINT = 1;

/** Parses a PostGIS EWKB hex point (what Postgres returns for a geometry column). */
export function parseEwkbPoint(hex: string): LngLat {
  const bytes = new Uint8Array(hex.match(/../g)?.map((byte) => parseInt(byte, 16)) ?? []);
  const view = new DataView(bytes.buffer);
  if (bytes.length < 21) throw new Error("EWKB point too short");

  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  if ((type & 0xffff) !== WKB_POINT) throw new Error(`Expected an EWKB point, got type ${type}`);
  const offset = type & EWKB_SRID_FLAG ? 9 : 5;
  if (bytes.length < offset + 16) throw new Error("EWKB point too short");

  return {
    lng: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  };
}

// Exact location. Never expose it for fragile sites (see CLAUDE.md): approximate it first.
export const point = customType<{ data: LngLat; driverData: string }>({
  dataType: () => "geometry(Point, 4326)",
  toDriver: ({ lng, lat }) => sql`ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)`,
  fromDriver: parseEwkbPoint,
});
