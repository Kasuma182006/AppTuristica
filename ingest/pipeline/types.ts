import type { costEnum, difficultyEnum } from "@db/schema";

export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type Cost = (typeof costEnum.enumValues)[number];

export interface Point {
  lat: number;
  lon: number;
}

/** One source element behind a candidate, e.g. an OSM node, or one segment of a river. */
export interface SourceElement {
  /** OSM "node/123" | "way/123" | "relation/123" (as stored in place_sources.external_id). */
  externalId: string;
  /** Null when the source gave no position; such candidates are discarded later (HU-24). */
  point: Point | null;
  /** Raw tags, kept for later steps: access restrictions (HU-25), Wikidata (HU-27). */
  tags: Readonly<Record<string, string>>;
}

/**
 * A site in the common format, before municipality assignment and validation. Fields are null
 * when the source has no data; missing name or type get the candidate discarded (HU-24).
 */
export interface CandidatePlace {
  name: string | null;
  placeTypeSlug: string | null;
  difficulty: Difficulty | null;
  altitudeM: number | null;
  cost: Cost | null;
  /** In display order. */
  activitySlugs: string[];
  /** Usually one; a river has one per segment until HU-23 splits it by municipality. */
  elements: SourceElement[];
}

export type DiscardReason = "canal" | "duplicate-river-relation";

export interface DiscardedElement {
  externalId: string;
  reason: DiscardReason;
}
