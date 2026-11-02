import { locatePoints, type Location } from "@/modules/catalogs/locate";
import type { IngestDb } from "../db";
import type { CandidatePlace, LocatedCandidate, Point, SourceElement } from "./types";

export { locatePoints, type Location };

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
 * Elements take their located point (moved inside when near a border). Elements without a point
 * or outside every municipality form a site with no municipality.
 */
export function splitByMunicipality(
  candidate: CandidatePlace,
  locationOf: ReadonlyMap<string, Location | null>,
): LocatedCandidate[] {
  const groups = new Map<number | null, SourceElement[]>();
  for (const element of candidate.elements) {
    const location = element.point === null ? null : (locationOf.get(element.externalId) ?? null);
    const municipalityId = location?.municipalityId ?? null;
    const located = location === null ? element : { ...element, point: location.point };
    groups.set(municipalityId, [...(groups.get(municipalityId) ?? []), located]);
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
  const locations = await locatePoints(
    db,
    located.map((e) => e.point),
  );
  const locationOf = new Map(located.map((e, i) => [e.externalId, locations[i] ?? null]));
  return candidates.flatMap((candidate) => splitByMunicipality(candidate, locationOf));
}
