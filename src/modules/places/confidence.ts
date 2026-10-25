import type { costEnum, difficultyEnum, placeSourceEnum } from "@db/schema";

export type PlaceSource = (typeof placeSourceEnum.enumValues)[number];

/** What the confidence score looks at; the same for ingested and community sites. */
export interface ConfidenceInput {
  /** Sources of the site. Repeated kinds count once: a river's OSM segments are one source. */
  sources: readonly PlaceSource[];
  difficulty: (typeof difficultyEnum.enumValues)[number] | null;
  altitudeM: number | null;
  cost: (typeof costEnum.enumValues)[number] | null;
  photoCount: number;
  wikipediaUrl: string | null;
}

/**
 * Points of the confidence score (HU-30), documented in docs/confianza.md. Every site starts
 * from the base (name, type, municipality and point, from one source); each field counts the
 * same for every type. A site with two sources and every field reaches 100.
 */
export const CONFIDENCE_POINTS = {
  base: 30,
  /** Each source beyond the first, e.g. the Wikidata item of an OSM site. */
  extraSource: 20,
  photos: 20,
  difficulty: 10,
  cost: 10,
  altitude: 5,
  wikipedia: 5,
} as const;

/** Confidence score, 0–100 (places.confidence), from the number of sources and filled fields. */
export function confidenceScore(site: ConfidenceInput): number {
  const sourceCount = new Set(site.sources).size;
  if (sourceCount === 0) throw new Error("A site needs at least one source");

  const p = CONFIDENCE_POINTS;
  const score =
    p.base +
    p.extraSource * (sourceCount - 1) +
    (site.photoCount > 0 ? p.photos : 0) +
    (site.difficulty !== null ? p.difficulty : 0) +
    (site.cost !== null ? p.cost : 0) +
    (site.altitudeM !== null ? p.altitude : 0) +
    (site.wikipediaUrl !== null ? p.wikipedia : 0);
  return Math.min(score, 100);
}
