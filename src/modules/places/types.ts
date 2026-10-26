import type {
  costEnum,
  difficultyEnum,
  originEnum,
  placeSourceEnum,
  sensitivityEnum,
} from "@db/schema";
import type { CatalogItem } from "@/modules/catalogs/types";

export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type Origin = (typeof originEnum.enumValues)[number];

/** Spanish values of the Dificultad filter (RF-02); `sin-dato` matches sites without one. */
export const DIFFICULTY_SLUGS = {
  facil: "easy",
  moderada: "moderate",
  dificil: "hard",
  "sin-dato": null,
} as const satisfies Record<string, Difficulty | null>;

export type DifficultySlug = keyof typeof DIFFICULTY_SLUGS;

/** Spanish values of the Origen filter (RF-02). */
export const ORIGIN_SLUGS = {
  abiertas: "open_data",
  comunidad: "community",
} as const satisfies Record<string, Origin>;

export type OriginSlug = keyof typeof ORIGIN_SLUGS;

/**
 * Site search filters (RF-02, RF-03): AND between filters, OR within a list.
 * An absent filter does not restrict the results.
 */
export interface PlaceFilters {
  municipality?: string;
  placeTypes?: string[];
  activities?: string[];
  /** `null` stands for sites without a difficulty. */
  difficulties?: (Difficulty | null)[];
  origins?: Origin[];
  /** Excludes sites in protected areas or on private property (HU-49). */
  freeAccessOnly: boolean;
}

/** Where to draw a site: exact, or the center of a ~2 km area for fragile sites (HU-39). */
export interface PlaceLocation {
  lat: number;
  lng: number;
  approximate: boolean;
  /** Radius of the area to draw when approximate; null for exact points. */
  radiusM: number | null;
}

/** A site in search results: the card data (RF-05) without photo yet. */
export interface PlaceSummary {
  slug: string;
  name: string;
  municipality: CatalogItem;
  placeType: CatalogItem;
  /** In the catalog's display order. */
  activities: CatalogItem[];
  difficulty: Exclude<DifficultySlug, "sin-dato"> | null;
  origin: OriginSlug;
  /** In a protected area or on private property. */
  restricted: boolean;
  confidence: number;
  /** Never exact for fragile sites. */
  location: PlaceLocation;
}

/** Values of the `orden` parameter (RF-07); the first one is the default. */
export const SORT_SLUGS = ["confianza", "recientes", "alfabetico"] as const;

export type PlaceSort = (typeof SORT_SLUGS)[number];

export const PAGE_SIZE = { default: 24, max: 100 } as const;

/** What to fetch: the filters plus order and page (HU-37). Pages start at 1. */
export interface PlaceQuery {
  filters: PlaceFilters;
  sort: PlaceSort;
  page: number;
  pageSize: number;
}

/** One page of results; a page past the last one is empty. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** 0 when nothing matches. */
  totalPages: number;
}

export type Cost = (typeof costEnum.enumValues)[number];
export type Sensitivity = (typeof sensitivityEnum.enumValues)[number];
export type PlaceSource = (typeof placeSourceEnum.enumValues)[number];

/** Spanish values of the entrance cost. */
export const COST_SLUGS = { gratis: "free", pago: "paid" } as const satisfies Record<string, Cost>;

export type CostSlug = keyof typeof COST_SLUGS;

/** Source names in API responses: OSM and Wikidata keep their own, the community is Spanish. */
export const SOURCE_NAMES = {
  openstreetmap: "openstreetmap",
  wikidata: "wikidata",
  community: "comunidad",
} as const satisfies Record<PlaceSource, string>;

/** A Wikimedia Commons photo with the attribution shown under it (RF-11). */
export interface PlacePhoto {
  url: string;
  width: number | null;
  height: number | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** The file's page at the source; null for fragile sites (it may reveal the location). */
  sourceUrl: string | null;
}

/** Everything the site page shows (HU-38, RF-10 to RF-15). */
export interface PlaceDetail extends Omit<PlaceSummary, "restricted"> {
  /** Generated from templates or written by the community. */
  description: string | null;
  /** Wikidata's short description (CC0): show it as Wikidata's, never as the site's. */
  wikidataDescription: string | null;
  wikipediaUrl: string | null;
  altitudeM: number | null;
  cost: CostSlug | null;
  fragile: boolean;
  inProtectedArea: boolean;
  privateProperty: boolean;
  /** In gallery order; the first one is the cover. */
  photos: PlacePhoto[];
  /**
   * One per OSM element or Wikidata item. No links for community sources, nor for fragile
   * sites: the element would reveal the exact location (HU-39).
   */
  sources: { source: (typeof SOURCE_NAMES)[PlaceSource]; url: string | null }[];
  /** Last time ingest still found the site (RF-15), or its last change. ISO 8601. */
  updatedAt: string;
}
