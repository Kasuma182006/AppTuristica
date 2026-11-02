import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { z } from "zod";
import type * as schema from "@db/schema";

/**
 * Points this close to a municipality are moved into it: the department polygon misses part of
 * the Pacific coastline (beaches 1–32 m off) and border rivers fall just outside (up to ~120 m).
 */
export const BORDER_TOLERANCE_M = 200;
// How far past the border a moved point goes, so it is inside and not on the boundary.
const MOVE_INSIDE_M = 1;
// Bounding-box prefilter in degrees (~330 m), cheaper than a geographic distance per polygon.
const TOLERANCE_BOX_DEG = 0.003;

/** Municipality of a point, with the point moved inside when it was within the tolerance. */
export interface Location {
  municipalityId: number;
  point: { lat: number; lon: number };
}

const lookupRowSchema = z.object({
  idx: z.number().int(),
  municipality_id: z.number().int().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});

/**
 * Locates each point, in input order, for the ingest and for proposals: the municipality covering
 * it (ST_Covers, like the `places` trigger in migration 0006, so a located site always passes it
 * when saved), or else the nearest one within BORDER_TOLERANCE_M, moving the point just inside it.
 * Null when neither exists. A point on a shared border goes to the municipality with the lowest
 * DIVIPOLA code.
 */
export async function locatePoints(
  db: PgDatabase<PostgresJsQueryResultHKT, typeof schema>,
  points: readonly { lat: number; lon: number }[],
): Promise<(Location | null)[]> {
  if (points.length === 0) return [];
  // JSON instead of array parameters: Drizzle expands JS arrays into lists of placeholders.
  const rows = await db.execute(sql`
    SELECT
      p.idx::int AS idx,
      COALESCE(inside.id, near.id) AS municipality_id,
      ST_Y(COALESCE(CASE WHEN inside.id IS NOT NULL THEN pt.geom END, near.moved)) AS lat,
      ST_X(COALESCE(CASE WHEN inside.id IS NOT NULL THEN pt.geom END, near.moved)) AS lon
    FROM jsonb_array_elements(${JSON.stringify(points)}::jsonb) WITH ORDINALITY AS p(value, idx)
    CROSS JOIN LATERAL (
      SELECT ST_SetSRID(
        ST_MakePoint((p.value->>'lon')::float8, (p.value->>'lat')::float8), 4326
      ) AS geom
    ) pt
    LEFT JOIN LATERAL (
      SELECT m.id FROM municipalities m
      WHERE ST_Covers(m.geom, pt.geom)
      ORDER BY m.code
      LIMIT 1
    ) inside ON true
    LEFT JOIN LATERAL (
      SELECT m.id, moved.geom AS moved
      FROM municipalities m
      CROSS JOIN LATERAL (SELECT ST_ClosestPoint(m.geom, pt.geom) AS geom) closest
      CROSS JOIN LATERAL (
        SELECT ST_Project(
          closest.geom::geography, ${MOVE_INSIDE_M}, ST_Azimuth(pt.geom, closest.geom)
        )::geometry AS geom
      ) moved
      WHERE inside.id IS NULL
        AND m.geom && ST_Expand(pt.geom, ${TOLERANCE_BOX_DEG})
        AND ST_DWithin(m.geom::geography, pt.geom::geography, ${BORDER_TOLERANCE_M})
        AND ST_Covers(m.geom, moved.geom)
      ORDER BY ST_Distance(m.geom::geography, pt.geom::geography), m.code
      LIMIT 1
    ) near ON true
    ORDER BY p.idx
  `);
  const parsed = z.array(lookupRowSchema).parse([...rows]);
  if (parsed.length !== points.length) {
    throw new Error(
      `Municipality lookup returned ${parsed.length} rows for ${points.length} points`,
    );
  }
  return parsed.map((row) =>
    row.municipality_id === null || row.lat === null || row.lon === null
      ? null
      : { municipalityId: row.municipality_id, point: { lat: row.lat, lon: row.lon } },
  );
}
