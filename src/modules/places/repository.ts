import { and, asc, count, desc, eq, exists, inArray, isNull, or, type SQL } from "drizzle-orm";
import { activities, municipalities, placeActivities, places, placeTypes } from "@db/schema";
import type { Db } from "@/lib/db";
import type { CatalogItem } from "@/modules/catalogs/types";
import type { Difficulty, Origin, PlaceFilters, PlaceQuery, PlaceSort } from "./types";

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
}

/** SQL conditions for the filters: AND between filters, OR within each list (RF-03). */
function filterConditions(db: Db, filters: PlaceFilters): SQL[] {
  // Hidden sites (3 reports) never appear in any response.
  const conditions: SQL[] = [eq(places.status, "published")];

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
  recientes: [desc(places.createdAt), asc(places.name), asc(places.id)],
  alfabetico: [asc(places.name), asc(places.id)],
};

/** One page of published sites matching the filters, with their activities and the total. */
export async function findPlaces(
  db: Db,
  { filters, sort, page, pageSize }: PlaceQuery,
): Promise<{ rows: PlaceRow[]; total: number }> {
  const where = and(...filterConditions(db, filters));

  const countQuery = db
    .select({ total: count() })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(where);

  const pageQuery = db
    .select({
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
    })
    .from(places)
    .innerJoin(municipalities, eq(municipalities.id, places.municipalityId))
    .innerJoin(placeTypes, eq(placeTypes.id, places.placeTypeId))
    .where(where)
    .orderBy(...ORDER_BY[sort])
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [[counted], rows] = await Promise.all([countQuery, pageQuery]);
  const total = counted?.total ?? 0;
  if (rows.length === 0) return { rows: [], total };

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
  return {
    rows: rows.map((row) => ({
      ...row,
      activities: (activitiesByPlace.get(row.id) ?? []).map(({ slug, name }) => ({ slug, name })),
    })),
    total,
  };
}
