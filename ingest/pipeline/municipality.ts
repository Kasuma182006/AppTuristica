import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IngestDb } from "../db";
import type { CandidatePlace, LocatedCandidate, Point, SourceElement } from "./types";

const lookupRowSchema = z.object({
  idx: z.number().int(),
  municipality_id: z.number().int().nullable(),
});

/**
 * Municipality id covering each point, in input order (null when none does). Uses ST_Covers like
 * the `places` trigger (migration 0006), so an assigned site always passes it when saved. A point
 * on a shared border goes to the municipality with the lowest DIVIPOLA code.
 */
export async function findMunicipalities(
  db: IngestDb,
  points: readonly Point[],
): Promise<(number | null)[]> {
  if (points.length === 0) return [];
  // JSON instead of array parameters: Drizzle expands JS arrays into lists of placeholders.
  const rows = await db.execute(sql`
    SELECT p.idx::int AS idx, m.id AS municipality_id
    FROM jsonb_array_elements(${JSON.stringify(points)}::jsonb) WITH ORDINALITY AS p(value, idx)
    LEFT JOIN LATERAL (
      SELECT municipalities.id FROM municipalities
      WHERE ST_Covers(
        municipalities.geom,
        ST_SetSRID(ST_MakePoint((p.value->>'lon')::float8, (p.value->>'lat')::float8), 4326)
      )
      ORDER BY municipalities.code
      LIMIT 1
    ) m ON true
    ORDER BY p.idx
  `);
  const parsed = z.array(lookupRowSchema).parse([...rows]);
  if (parsed.length !== points.length) {
    throw new Error(
      `Municipality lookup returned ${parsed.length} rows for ${points.length} points`,
    );
  }
  return parsed.map((row) => row.municipality_id);
}

/**
 * The point closest to the average of all of them: for a river, the center of its most central
 * segment, which lies on (or next to) the river, unlike the plain average of a curved course.
 */
export function mostCentralPoint(points: readonly Point[]): Point | null {
  if (points.length === 0) return null;
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
  // Longitude degrees shrink with latitude; enough for comparing distances within a department.
  const lonScale = Math.cos((lat * Math.PI) / 180);
  const distance = (p: Point) => (p.lat - lat) ** 2 + ((p.lon - lon) * lonScale) ** 2;
  return points.reduce((best, p) => (distance(p) < distance(best) ? p : best));
}

/**
 * Splits a candidate into one site per municipality of its elements (a river crossing three
 * municipalities becomes three sites), each represented by its most central element point.
 * Elements without a point or outside every municipality form a site with no municipality.
 */
export function splitByMunicipality(
  candidate: CandidatePlace,
  municipalityOf: ReadonlyMap<string, number | null>,
): LocatedCandidate[] {
  const groups = new Map<number | null, SourceElement[]>();
  for (const element of candidate.elements) {
    const municipalityId =
      element.point === null ? null : (municipalityOf.get(element.externalId) ?? null);
    groups.set(municipalityId, [...(groups.get(municipalityId) ?? []), element]);
  }

  return [...groups].map(([municipalityId, elements]) => ({
    ...candidate,
    elements,
    point: mostCentralPoint(elements.flatMap((e) => (e.point === null ? [] : [e.point]))),
    municipalityId,
  }));
}

/** Assigns municipalities to every candidate (HU-23), splitting the ones that span several. */
export async function assignMunicipalities(
  db: IngestDb,
  candidates: readonly CandidatePlace[],
): Promise<LocatedCandidate[]> {
  const located = candidates
    .flatMap((c) => c.elements)
    .flatMap((e) => (e.point === null ? [] : [{ externalId: e.externalId, point: e.point }]));
  const municipalityIds = await findMunicipalities(
    db,
    located.map((e) => e.point),
  );
  const municipalityOf = new Map(located.map((e, i) => [e.externalId, municipalityIds[i] ?? null]));
  return candidates.flatMap((candidate) => splitByMunicipality(candidate, municipalityOf));
}
