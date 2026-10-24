import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IngestDb } from "../db";
import type { Point, RestrictedSite, SourceElement, ValidSite } from "./types";

/** An area given as the lines of its boundary; PostGIS assembles them into polygons. */
export interface AreaLines {
  lines: [number, number][][];
}

const insideRowSchema = z.object({ idx: z.number().int(), inside: z.boolean() });

/**
 * Whether each point lies inside any of the areas (ST_Covers), in input order. ST_BuildArea turns
 * each area's lines (outer and inner rings, in any order) into polygons; unclosed lines are ignored.
 */
export async function findPointsInAreas(
  db: IngestDb,
  areas: readonly AreaLines[],
  points: readonly Point[],
): Promise<boolean[]> {
  if (points.length === 0) return [];
  if (areas.length === 0) return points.map(() => false);
  const geometries = areas.map((a) =>
    JSON.stringify({ type: "MultiLineString", coordinates: a.lines }),
  );

  // MATERIALIZED: build each polygon once, not once per point.
  const rows = await db.execute(sql`
    WITH area AS MATERIALIZED (
      SELECT ST_BuildArea(ST_SetSRID(ST_GeomFromGeoJSON(g.value #>> '{}'), 4326)) AS geom
      FROM jsonb_array_elements(${JSON.stringify(geometries)}::jsonb) AS g(value)
    )
    SELECT p.idx::int AS idx, EXISTS (
      SELECT 1 FROM area
      WHERE area.geom IS NOT NULL
        AND ST_Covers(
          area.geom,
          ST_SetSRID(ST_MakePoint((p.value->>'lon')::float8, (p.value->>'lat')::float8), 4326)
        )
    ) AS inside
    FROM jsonb_array_elements(${JSON.stringify(points)}::jsonb) WITH ORDINALITY AS p(value, idx)
    ORDER BY p.idx
  `);
  const parsed = z.array(insideRowSchema).parse([...rows]);
  if (parsed.length !== points.length) {
    throw new Error(`Area lookup returned ${parsed.length} rows for ${points.length} points`);
  }
  return parsed.map((row) => row.inside);
}

/** The element whose point represents the site (see splitByMunicipality); else the first one. */
export function representativeElement(site: ValidSite): SourceElement {
  const { lat, lon } = site.point;
  const element =
    site.elements.find((e) => e.point?.lat === lat && e.point.lon === lon) ?? site.elements[0];
  if (element === undefined) throw new Error(`Site "${site.name}" has no elements`);
  return element;
}

/**
 * Access restrictions (HU-25), judged on the representative element (what the visitor sees):
 * inside a protected area, or being one, makes the site fragile; `access=private` marks private
 * property.
 */
export function applyRestrictions(
  site: ValidSite,
  insideProtectedArea: boolean,
  isProtectedArea: (tags: SourceElement["tags"]) => boolean,
): RestrictedSite {
  const { tags } = representativeElement(site);
  const inProtectedArea = insideProtectedArea || isProtectedArea(tags);
  return {
    ...site,
    inProtectedArea,
    privateProperty: tags.access === "private",
    sensitivity: inProtectedArea ? "fragile" : "normal",
  };
}
