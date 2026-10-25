import type { costEnum, difficultyEnum, sensitivityEnum } from "@db/schema";

export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type Cost = (typeof costEnum.enumValues)[number];
export type Sensitivity = (typeof sensitivityEnum.enumValues)[number];

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
  /** Wikidata item linked from OSM (`wikidata=Q…`), enriched in HU-27. */
  wikidataId: string | null;
  /** Usually one; a river has one per segment until HU-23 splits it by municipality. */
  elements: SourceElement[];
}

/** A candidate after municipality assignment (HU-23): one municipality, one point. */
export interface LocatedCandidate extends CandidatePlace {
  /** The element point that represents the site; null when no element has one. */
  point: Point | null;
  /** Municipality whose polygon covers the point; null when none does (discarded in HU-24). */
  municipalityId: number | null;
}

/** A located candidate with every minimum field (HU-24), ready for the next pipeline steps. */
export interface ValidSite extends LocatedCandidate {
  name: string;
  placeTypeSlug: string;
  point: Point;
  municipalityId: number;
}

/** A valid site with its access restrictions (HU-25). */
export interface RestrictedSite extends ValidSite {
  inProtectedArea: boolean;
  privateProperty: boolean;
  /** Fragile sites never expose their exact location (CLAUDE.md). */
  sensitivity: Sensitivity;
}

/** Data taken from the site's Wikidata item (HU-27), all in Spanish. */
export interface WikidataInfo {
  id: string;
  /** Wikidata's short description (CC0), or null when it has none in Spanish. */
  description: string | null;
  /** Spanish Wikipedia article, or null when there is none. */
  wikipediaUrl: string | null;
  /** Commons file name of the item's image (P18), e.g. "Lago Calima.jpg"; used by HU-28. */
  image: string | null;
  /** Commons category of the item (P373), without the "Category:" prefix; used by HU-28. */
  commonsCategory: string | null;
}

/** A Commons photo of a site, with the attribution its license requires (HU-28). */
export interface PhotoCandidate {
  /** Image file at upload.wikimedia.org. */
  url: string;
  author: string;
  /** License name as Commons gives it, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string | null;
  /** File page at commons.wikimedia.org, linked from the attribution. */
  sourceUrl: string;
  width: number | null;
  height: number | null;
}

/** A site with its photos (first = cover; at most five). */
export interface SiteWithPhotos extends EnrichedSite {
  photos: PhotoCandidate[];
}

/** A site with its template description (HU-29), ready for scoring. */
export interface DescribedSite extends SiteWithPhotos {
  description: string;
}

/** A described site with its confidence score (HU-30), 0–100, ready for saving. */
export interface ScoredSite extends DescribedSite {
  confidence: number;
}

/** A deduplicated site with its Wikidata data (null when OSM links no existing item). */
export interface EnrichedSite extends RestrictedSite {
  wikidata: WikidataInfo | null;
}

export type DiscardReason =
  // OSM data quality (HU-22).
  | "canal"
  | "river-relation"
  // Minimum fields and location (HU-24).
  | "no-name"
  // Infrastructure named like a tourist site (HU-26), e.g. a landfill's ponds.
  | "not-tourist"
  | "no-type"
  | "no-point"
  | "outside-area";

/** A candidate left out of the run, logged with its reason. */
export interface Discarded {
  externalIds: string[];
  name: string | null;
  reason: DiscardReason;
}
