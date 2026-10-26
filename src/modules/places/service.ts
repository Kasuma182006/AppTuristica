import { getDb } from "@/lib/db";
import { APPROX_RADIUS_M, approximateLocation, roundCoordinate } from "@/lib/geo";
import { SLUG_PATTERN } from "@/lib/slug";
import { getCatalogs } from "@/modules/catalogs/service";
import type { CatalogItem } from "@/modules/catalogs/types";
import { findUnknownSlug, type ParseResult } from "./filters";
import {
  countPlacesByMunicipality,
  countPlacesByPlaceType,
  findPlaceBySlug,
  findPlaces,
  type PlaceDetailRow,
  type PlaceRow,
} from "./repository";
import {
  COST_SLUGS,
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  SOURCE_NAMES,
  type Cost,
  type CostSlug,
  type Difficulty,
  type DifficultySlug,
  type Origin,
  type OriginSlug,
  type Page,
  type FilterOption,
  type FilterOptions,
  type PlaceDetail,
  type PlaceLocation,
  type PlaceQuery,
  type PlaceSummary,
} from "./types";

const slugByDifficulty = new Map(
  Object.entries(DIFFICULTY_SLUGS).map(([slug, value]) => [value, slug as DifficultySlug]),
) as ReadonlyMap<Difficulty, Exclude<DifficultySlug, "sin-dato">>;

const slugByOrigin = new Map(
  Object.entries(ORIGIN_SLUGS).map(([slug, value]) => [value, slug as OriginSlug]),
) as ReadonlyMap<Origin, OriginSlug>;

const slugByCost = new Map(
  Object.entries(COST_SLUGS).map(([slug, value]) => [value, slug as CostSlug]),
) as ReadonlyMap<Cost, CostSlug>;

/** Exact for normal sites; the center of a ~2 km area for fragile ones (HU-39). */
export function toPublicLocation(row: Pick<PlaceRow, "location" | "sensitivity">): PlaceLocation {
  if (row.sensitivity === "fragile") {
    const { lat, lng } = approximateLocation(row.location);
    return { lat, lng, approximate: true, radiusM: APPROX_RADIUS_M };
  }
  return {
    lat: roundCoordinate(row.location.lat),
    lng: roundCoordinate(row.location.lng),
    approximate: false,
    radiusM: null,
  };
}

/** Fields shared by search results and site pages, with Spanish filter values. */
function toPublicFields(row: PlaceRow): Omit<PlaceSummary, "restricted"> {
  const origin = slugByOrigin.get(row.origin);
  if (!origin) throw new Error(`No slug for origin ${row.origin}`);

  return {
    slug: row.slug,
    name: row.name,
    municipality: row.municipality,
    placeType: row.placeType,
    activities: row.activities,
    difficulty: row.difficulty ? (slugByDifficulty.get(row.difficulty) ?? null) : null,
    origin,
    confidence: row.confidence,
    location: toPublicLocation(row),
  };
}

/** The public shape of a site in search results. */
export function toPlaceSummary(row: PlaceRow): PlaceSummary {
  return { ...toPublicFields(row), restricted: row.inProtectedArea || row.privateProperty };
}

/**
 * One page of published sites matching the filters (HU-36, HU-37), for the web and
 * `GET /api/v1/places`. Fails when a filter names a municipality, type or activity that does
 * not exist.
 */
export async function searchPlaces(query: PlaceQuery): Promise<ParseResult<Page<PlaceSummary>>> {
  const unknown = findUnknownSlug(query.filters, await getCatalogs());
  if (unknown) return { ok: false, message: unknown };

  const { rows, total } = await findPlaces(getDb(), query);
  return {
    ok: true,
    value: {
      items: rows.map(toPlaceSummary),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/** The public shape of a site page (HU-38): the summary plus description, photos and sources. */
export function toPlaceDetail(row: PlaceDetailRow): PlaceDetail {
  const fragile = row.sensitivity === "fragile";
  const lastSeen = Math.max(...row.sources.map((source) => source.lastSeenAt.getTime()));

  return {
    ...toPublicFields(row),
    description: row.description,
    wikidataDescription: row.wikidataDescription,
    wikipediaUrl: row.wikipediaUrl,
    altitudeM: row.altitudeM,
    cost: row.cost ? (slugByCost.get(row.cost) ?? null) : null,
    fragile,
    inProtectedArea: row.inProtectedArea,
    privateProperty: row.privateProperty,
    // Links to the OSM element, the Wikidata item or the Commons file would reveal the exact
    // location of a fragile site.
    photos: fragile ? row.photos.map((photo) => ({ ...photo, sourceUrl: null })) : row.photos,
    sources: row.sources.map(({ source, url }) => ({
      source: SOURCE_NAMES[source],
      url: fragile ? null : url,
    })),
    updatedAt: new Date(row.sources.length > 0 ? lastSeen : row.updatedAt.getTime()).toISOString(),
  };
}

/** A published site by slug (HU-38); undefined when it does not exist or is hidden. */
export async function getPlace(slug: string): Promise<PlaceDetail | undefined> {
  if (!SLUG_PATTERN.test(slug)) return undefined;

  const row = await findPlaceBySlug(getDb(), slug);
  return row && toPlaceDetail(row);
}

function withCounts(items: CatalogItem[], counts: ReadonlyMap<string, number>): FilterOption[] {
  return items.map((item) => ({ ...item, placeCount: counts.get(item.slug) ?? 0 }));
}

/** Every value of the panel's catalog filters, with its published sites (HU-44, HU-45). */
export async function getFilterOptions(): Promise<FilterOptions> {
  const db = getDb();
  const [catalogs, byMunicipality, byPlaceType] = await Promise.all([
    getCatalogs(),
    countPlacesByMunicipality(db),
    countPlacesByPlaceType(db),
  ]);
  return {
    municipalities: withCounts(catalogs.municipalities, byMunicipality),
    placeTypes: withCounts(catalogs.placeTypes, byPlaceType),
  };
}
