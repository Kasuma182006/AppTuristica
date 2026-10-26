import type { difficultyEnum, originEnum } from "@db/schema";
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

/** A site in search results: the card data (RF-05) without photo or location yet. */
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
