import { getDb } from "@/lib/db";
import {
  APPROX_RADIUS_M,
  approximateLocation,
  distanceM,
  DUPLICATE_DISTANCE_M,
  roundCoordinate,
} from "@/lib/geo";
import { SLUG_PATTERN } from "@/lib/slug";
import { getCatalogs } from "@/modules/catalogs/service";
import type { CatalogItem } from "@/modules/catalogs/types";
import {
  activeFilters,
  findUnknownSlug,
  withoutFilter,
  type FilterParam,
  type ParseResult,
} from "./filters";
import {
  countPlacesByActivity,
  countPlacesByDifficulty,
  countPlacesByMunicipality,
  countPlacesByOrigin,
  countPlacesByPlaceType,
  countPlacesByTypeInMunicipality,
  countRestrictedPlaces,
  findOtherPlacesInMunicipality,
  findPlaceBySlug,
  countPlaces,
  publishedPlaceExists,
  findPlacePoints,
  findPlaces,
  findPlacesNear,
  findSitemapPlaces,
  type NearbyPlaceRow,
  type PhotoRow,
  type PlaceDetailRow,
  type PlaceRow,
  type PlaceSummaryRow,
  type PlacePointRow,
} from "./repository";
import { similarPlaceNames } from "./place-names";
import type { SitemapData } from "@/lib/sitemap";
import {
  COST_SLUGS,
  DIFFICULTY_LABELS,
  DIFFICULTY_SLUGS,
  ORIGIN_LABELS,
  ORIGIN_SLUGS,
  OTHER_PLACES_SHOWN,
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
  type OtherPlaces,
  type PlaceDetail,
  type PlaceFilters,
  type PlaceLocation,
  type PlacePhoto,
  type PlacePoint,
  type PlaceQuery,
  type PlaceSummary,
  type RelatedPlace,
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
/** Links to the Commons file would reveal the exact location of a fragile site. */
function toPublicPhoto(photo: PhotoRow, fragile: boolean): PlacePhoto {
  return fragile ? { ...photo, sourceUrl: null } : photo;
}

function toPublicFields(row: PlaceRow): Omit<PlaceSummary, "restricted" | "photo"> {
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
export function toPlaceSummary(row: PlaceSummaryRow): PlaceSummary {
  return {
    ...toPublicFields(row),
    restricted: row.inProtectedArea || row.privateProperty,
    photo: row.cover && toPublicPhoto(row.cover, row.sensitivity === "fragile"),
  };
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

function toPlacePoint(row: PlacePointRow): PlacePoint {
  return {
    slug: row.slug,
    name: row.name,
    municipality: row.municipality,
    placeType: row.placeType,
    location: toPublicLocation(row),
  };
}

/**
 * Every published site matching the filters, placed on the map (HU-57). Fails, like
 * searchPlaces, when a filter names a municipality, type or activity that does not exist.
 */
export async function searchPlacePoints(filters: PlaceFilters): Promise<ParseResult<PlacePoint[]>> {
  const unknown = findUnknownSlug(filters, await getCatalogs());
  if (unknown) return { ok: false, message: unknown };
  return { ok: true, value: (await findPlacePoints(getDb(), filters)).map(toPlacePoint) };
}

/**
 * For a search without results (HU-55): how many sites there would be without each active
 * filter, so the visitor knows which one to remove. Most useful first; filters whose removal
 * still finds nothing are left out.
 */
export async function countWithoutEachFilter(
  filters: PlaceFilters,
): Promise<{ param: FilterParam; total: number }[]> {
  const db = getDb();
  const counts = await Promise.all(
    activeFilters(filters).map(async (param) => ({
      param,
      total: await countPlaces(db, withoutFilter(filters, param)),
    })),
  );
  return counts.filter((count) => count.total > 0).sort((a, b) => b.total - a.total);
}

/** The public shape of a site page (HU-38): the summary plus description, photos and sources. */
export function toPlaceDetail(row: PlaceDetailRow): PlaceDetail {
  const fragile = row.sensitivity === "fragile";
  const lastSeen = Math.max(...row.sources.map((source) => source.lastSeenAt.getTime()));

  return {
    ...toPublicFields(row),
    department: row.department,
    description: row.description,
    wikidataDescription: row.wikidataDescription,
    // The article usually has the coordinates of a lake or a reserve (HU-59).
    wikipediaUrl: fragile ? null : row.wikipediaUrl,
    altitudeM: row.altitudeM,
    cost: row.cost ? (slugByCost.get(row.cost) ?? null) : null,
    fragile,
    inProtectedArea: row.inProtectedArea,
    privateProperty: row.privateProperty,
    // Links to the OSM element or the Wikidata item would reveal the exact location of a
    // fragile site, as would the Commons file (see toPublicPhoto).
    photos: row.photos.map((photo) => toPublicPhoto(photo, fragile)),
    sources: row.sources.map(({ source, url }) => ({
      source: SOURCE_NAMES[source],
      url: fragile ? null : url,
    })),
    updatedAt: new Date(row.sources.length > 0 ? lastSeen : row.updatedAt.getTime()).toISOString(),
  };
}

/** Whether a site page exists, without loading it (HU-69: proxy.ts answers 404 otherwise). */
export async function placeExists(slug: string): Promise<boolean> {
  if (!SLUG_PATTERN.test(slug)) return false;
  return publishedPlaceExists(getDb(), slug);
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

/** Every value of the panel's filters, with its published sites (HU-44 to HU-49). */
export async function getFilterOptions(): Promise<FilterOptions> {
  const db = getDb();
  const [catalogs, byMunicipality, byPlaceType, byActivity, byDifficulty, byOrigin, restricted] =
    await Promise.all([
      getCatalogs(),
      countPlacesByMunicipality(db),
      countPlacesByPlaceType(db),
      countPlacesByActivity(db),
      countPlacesByDifficulty(db),
      countPlacesByOrigin(db),
      countRestrictedPlaces(db),
    ]);
  return {
    municipalities: withCounts(catalogs.municipalities, byMunicipality),
    placeTypes: withCounts(catalogs.placeTypes, byPlaceType),
    activities: withCounts(catalogs.activities, byActivity),
    difficulties: Object.entries(DIFFICULTY_SLUGS).map(([slug, value]) => ({
      slug,
      name: DIFFICULTY_LABELS[slug as DifficultySlug],
      placeCount: byDifficulty.get(value) ?? 0,
    })),
    origins: Object.entries(ORIGIN_SLUGS).map(([slug, value]) => ({
      slug,
      name: ORIGIN_LABELS[slug as OriginSlug],
      placeCount: byOrigin.get(value) ?? 0,
    })),
    restrictedCount: restricted,
  };
}

/** Other published sites of the site's municipality (HU-67); none when it is the only one. */
export async function getOtherPlaces(
  place: Pick<PlaceDetail, "slug" | "municipality">,
): Promise<OtherPlaces> {
  const db = getDb();
  const [total, places] = await Promise.all([
    countPlaces(db, { municipality: place.municipality.slug, freeAccessOnly: false }),
    findOtherPlacesInMunicipality(db, place.municipality.slug, place.slug, OTHER_PLACES_SHOWN),
  ]);
  return { total, places };
}

/**
 * How far around a point to look for duplicates, in degrees (~4.4 km). It reaches every fragile site
 * that may match: the area's 2 km plus the ~1.6 km the exact point may be from the area's center.
 */
const NEARBY_DEGREES = 0.04;

/**
 * Which sites near a point may be the one being proposed (HU-81), nearest first: a similar name
 * closer than 200 m. A fragile site is compared only through its public location, within its
 * 2 km area: comparing its real point would let anyone find it by trying coordinates.
 */
export function possibleDuplicates(
  rows: readonly NearbyPlaceRow[],
  point: { lat: number; lon: number },
  name: string,
): Pick<RelatedPlace, "slug" | "name">[] {
  return rows
    .filter((row) => similarPlaceNames(row.name, name))
    .map((row) => {
      const { lat, lng, approximate } = toPublicLocation(row);
      const distance = distanceM(point, { lat, lon: lng });
      const limit = approximate ? APPROX_RADIUS_M : DUPLICATE_DISTANCE_M;
      return { slug: row.slug, name: row.name, distance, near: distance < limit };
    })
    .filter((place) => place.near)
    .sort((a, b) => a.distance - b.distance)
    .map(({ slug, name: placeName }) => ({ slug, name: placeName }));
}

/** The published sites that may be the one being proposed (HU-81). */
export async function findPossibleDuplicates(
  point: { lat: number; lon: number },
  name: string,
): Promise<Pick<RelatedPlace, "slug" | "name">[]> {
  return possibleDuplicates(await findPlacesNear(getDb(), point, NEARBY_DEGREES), point, name);
}

/** What the sitemap lists (HU-72): published sites and the municipalities that have any. */
export async function getSitemapData(): Promise<SitemapData> {
  const db = getDb();
  const [places, municipalityCounts] = await Promise.all([
    findSitemapPlaces(db),
    countPlacesByMunicipality(db),
  ]);
  return { places, municipalitySlugs: [...municipalityCounts.keys()].sort() };
}

/** Published sites of a municipality per place type, most common first (HU-71). */
export async function getMunicipalityPlaceTypes(
  municipalitySlug: string,
): Promise<{ slug: string; name: string; total: number }[]> {
  return countPlacesByTypeInMunicipality(getDb(), municipalitySlug);
}
