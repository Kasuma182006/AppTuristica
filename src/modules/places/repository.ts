import { and, asc, count, desc, eq, exists, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import {
  activities,
  municipalities,
  photos,
  placeActivities,
  places,
  placeSources,
  placeTypes,
} from "@db/schema";
import type { Db } from "@/lib/db";
import type { LngLat } from "@db/schema/geometry";
import type { CatalogItem } from "@/modules/catalogs/types";
import type {
  Cost,
  Difficulty,
  Origin,
  PlaceFilters,
  PlaceQuery,
  PlaceSort,
  PlaceSource,
  Sensitivity,
} from "./types";

/** A matching site as stored, before mapping to the public shape. */
export interface PlaceRow {
  id: number;
  slug: string;
  name: string;
  municipality: CatalogItem;
  placeType: CatalogItem;
  activities: CatalogItem[];
  difficulty: Difficulty | null;
  origin: Origin;
  inProtectedArea: boolean;
  privateProperty: boolean;
  confidence: number;
  sensitivity: Sensitivity;
  /** Exact: approximate it before exposing a fragile site. */
  location: LngLat;
}

/** A site in search results, with its cover photo (HU-52). */
export interface PlaceSummaryRow extends PlaceRow {
  cover: PhotoRow | null;
}

/** A site with everything its page shows (HU-38). */
export interface PlaceDetailRow extends PlaceRow {
  description: string | null;
  wikidataDescription: string | null;
  wikipediaUrl: string | null;
  altitudeM: number | null;
  cost: Cost | null;
  /** When the site row last changed; used when it has no sources. */
  updatedAt: Date;
  photos: PhotoRow[];
  /** OSM elements first, then Wikidata, then the community. */
  sources: { source: PlaceSource; url: string | null; lastSeenAt: Date }[];
}

export interface PhotoRow {
  url: string;
  width: number | null;
  height: number | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

const SUMMARY_COLUMNS = {
  id: places.id,
  slug: places.slug,
  name: places.name,
  municipality: { slug: municipalities.slug, name: municipalities.name },
  placeType: { slug: placeTypes.slug, name: placeTypes.name },
  difficulty: places.difficulty,
  origin: places.origin,
  inProtectedArea: places.inProtectedArea,
  privateProperty: places.privateProperty,
  confidence: places.confidence,
  sensitivity: places.sensitivity,
  location: places.location,
};

const PHOTO_COLUMNS = {
  url: photos.url,
  width: photos.width,
  height: photos.height,
  author: photos.author,
  license: photos.license,
  licenseUrl: photos.licenseUrl,
  sourceUrl: photos.sourceUrl,
};

/** Adds each site's activities, in the catalog's display order. */
async function withActivities<T extends { id: number }>(
  db: Db,
  rows: T[],
): Promise<(T & { activities: CatalogItem[] })[]> {
  if (rows.length === 0) return [];

  const activityRows = await db
    .select({ placeId: placeActivities.placeId, slug: activities.slug, name: activities.name })
    .from(placeActivities)
    .innerJoin(activities, eq(activities.id, placeActivities.activityId))
    .where(
      inArray(
        placeActivities.placeId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(activities.sortOrder), asc(activities.id));

  const activitiesByPlace = Map.groupBy(activityRows, (row) => row.placeId);
  return rows.map((row) => ({
    ...row,
    activities: (activitiesByPlace.get(row.id) ?? []).map(({ slug, name }) => ({ slug, name })),
  }));
}

/**
 * Hidden sites (3 reports, HU-40) never appear in any response, count or sitemap: every
 * public query on `places` includes this condition (repository.test.ts checks it).
 */
export const isPublished: SQL = eq(places.status, "published");

/** SQL conditions for the filters: AND between filters, OR within each list (RF-03). */
function filterConditions(db: Db, filters: PlaceFilters): SQL[] {
  const conditions: SQL[] = [isPublished];

  if (filters.municipality) conditions.push(eq(municipalities.slug, filters.municipality));
  if (filters.placeTypes) conditions.push(inArray(placeTypes.slug, filters.placeTypes));
  if (filters.activities) {
    const withActivity = db
      .select({ placeId: placeActivities.placeId })
      .from(placeActivities)
      .innerJoin(activities, eq(activities.id, placeActivities.activityId))
      .where(
        and(eq(placeActivities.placeId, places.id), inArray(activities.slug, filters.activities)),
      );
    conditions.push(exists(withActivity));
  }
  if (filters.difficulties) {
    const values = filters.difficulties.filter((value): value is Difficulty => value !== null);
    const anyOf = or(
      values.length > 0 ? inArray(places.difficulty, values) : undefined,
      filters.difficulties.includes(null) ? isNull(places.difficulty) : undefined,
    );
    if (anyOf) conditions.push(anyOf);
  }
  if (filters.origins) conditions.push(inArray(places.origin, filters.origins));
  if (filters.freeAccessOnly) {
    conditions.push(eq(places.inProtectedArea, false), eq(places.privateProperty, false));
  }
  return conditions;
}

/** Ties break by name, then id, so pages never overlap. */
const ORDER_BY: Record<PlaceSort, SQL[]> = {
  confianza: [desc(places.confidence), asc(places.name), asc(places.id)],
  // By day in Colombia, then the most complete: a whole ingest run shares a day (HU-53).
  recientes: [
    desc(sql`date_trunc('day', ${places.createdAt} at time zone 'America/Bogota')`),
    desc(places.confidence),
    asc(places.name),
    asc(places.id),
  ],
  alfabetico: [asc(places.name), asc(places.id)],
};

/** Adds each site's cover: the first photo in gallery order, or null. */
async function withCovers<T extends { id: number }>(
  db: Db,
  rows: T[],
): Promise<(T & { cover: PhotoRow | null })[]> {
  if (rows.length === 0) return [];

  const photoRows = await db
    .select({ placeId: photos.placeId, ...PHOTO_COLUMNS })
    .from(photos)
    .where(
      inArray(
        photos.placeId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(photos.placeId), asc(photos.sortOrder), asc(photos.id));

  const covers = new Map<number, PhotoRow>();
  for (const { placeId, ...photo } of photoRows) {
    if (!covers.has(placeId)) covers.set(placeId, photo);
  }
  return rows.map((row) => ({ ...row, cover: covers.get(row.id) ?? null }));
}

/** A site on the map (HU-57): enough to place it and name it. */
export interface PlacePointRow {
  slug: string;
  name: string;
  municipality: string;
  placeType: CatalogItem;
  sensitivity: Sensitivity;
  /** Exact: approximate it before exposing a fragile site. */
  location: LngLat;
}

/** Most sites a map shows; the whole Valle has about 530. */
export const MAX_MAP_POINTS = 5000;

/** Every published site matching the filters, for the map (no pages, alphabetical). */
export async function findPlacePoints(db: Db, filters: PlaceFilters): Promise<PlacePointRow[]> {
  return db
    .select({
      slug: places.slug,
      name: places.name,
      municipality: municipalities.name,
      placeType: { slug: placeTypes.slug, name: placeTypes.name },
      sensitivity: places.sensitivity,
      location: places.location,
    })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(and(...filterConditions(db, filters)))
    .orderBy(asc(places.name), asc(places.id))
    .limit(MAX_MAP_POINTS);
}

/** How many published sites match the filters (HU-36; HU-55 counts without each filter). */
export async function countPlaces(db: Db, filters: PlaceFilters): Promise<number> {
  const [counted] = await db
    .select({ total: count() })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(and(...filterConditions(db, filters)));
  return counted?.total ?? 0;
}

/**
 * One page of published sites matching the filters, with their activities, covers and the
 * total.
 */
export async function findPlaces(
  db: Db,
  { filters, sort, page, pageSize }: PlaceQuery,
): Promise<{ rows: PlaceSummaryRow[]; total: number }> {
  const where = and(...filterConditions(db, filters));

  const pageQuery = db
    .select(SUMMARY_COLUMNS)
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(where)
    .orderBy(...ORDER_BY[sort])
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [total, rows] = await Promise.all([countPlaces(db, filters), pageQuery]);
  const [withActs, withCover] = await Promise.all([withActivities(db, rows), withCovers(db, rows)]);
  return {
    rows: withActs.map((row, index) => ({ ...row, cover: withCover[index]?.cover ?? null })),
    total,
  };
}

/** A published site with its activities, photos and sources; undefined when missing or hidden. */
export async function findPlaceBySlug(db: Db, slug: string): Promise<PlaceDetailRow | undefined> {
  const [row] = await db
    .select({
      ...SUMMARY_COLUMNS,
      description: places.description,
      wikidataDescription: places.wikidataDescription,
      wikipediaUrl: places.wikipediaUrl,
      altitudeM: places.altitudeM,
      cost: places.cost,
      updatedAt: places.updatedAt,
    })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(and(eq(places.slug, slug), isPublished));
  if (!row) return undefined;

  const [[withActs], photoRows, sourceRows] = await Promise.all([
    withActivities(db, [row]),
    db
      .select(PHOTO_COLUMNS)
      .from(photos)
      .where(eq(photos.placeId, row.id))
      .orderBy(asc(photos.sortOrder), asc(photos.id)),
    db
      .select({
        source: placeSources.source,
        url: placeSources.url,
        lastSeenAt: placeSources.lastSeenAt,
      })
      .from(placeSources)
      .where(eq(placeSources.placeId, row.id))
      // Enum order: openstreetmap, wikidata, community.
      .orderBy(asc(placeSources.source), asc(placeSources.externalId), asc(placeSources.id)),
  ]);
  if (!withActs) return undefined;

  return { ...withActs, photos: photoRows, sources: sourceRows };
}

/** Published sites per municipality slug (HU-44); municipalities without sites are absent. */
export async function countPlacesByMunicipality(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ slug: municipalities.slug, total: count() })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .where(isPublished)
    .groupBy(municipalities.slug);
  return new Map(rows.map((row) => [row.slug, row.total]));
}

/** Published sites per place type slug (HU-45); types without sites are absent. */
export async function countPlacesByPlaceType(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ slug: placeTypes.slug, total: count() })
    .from(places)
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(isPublished)
    .groupBy(placeTypes.slug);
  return new Map(rows.map((row) => [row.slug, row.total]));
}

/** Published sites per activity slug (HU-46); activities without sites are absent. */
export async function countPlacesByActivity(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ slug: activities.slug, total: count() })
    .from(placeActivities)
    .innerJoin(activities, eq(activities.id, placeActivities.activityId))
    .innerJoin(places, eq(places.id, placeActivities.placeId))
    .where(isPublished)
    .groupBy(activities.slug);
  return new Map(rows.map((row) => [row.slug, row.total]));
}

/** Published sites per difficulty (HU-47); `null` counts the sites without one. */
export async function countPlacesByDifficulty(db: Db): Promise<Map<Difficulty | null, number>> {
  const rows = await db
    .select({ difficulty: places.difficulty, total: count() })
    .from(places)
    .where(isPublished)
    .groupBy(places.difficulty);
  return new Map(rows.map((row) => [row.difficulty, row.total]));
}

/** Published sites per origin (HU-48). */
export async function countPlacesByOrigin(db: Db): Promise<Map<Origin, number>> {
  const rows = await db
    .select({ origin: places.origin, total: count() })
    .from(places)
    .where(isPublished)
    .groupBy(places.origin);
  return new Map(rows.map((row) => [row.origin, row.total]));
}

/** Published sites in a protected area or on private property (HU-49). */
export async function countRestrictedPlaces(db: Db): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(places)
    .where(
      and(isPublished, or(eq(places.inProtectedArea, true), eq(places.privateProperty, true))),
    );
  return row?.total ?? 0;
}
