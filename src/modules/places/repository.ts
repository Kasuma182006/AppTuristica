import { and, asc, eq, exists, inArray, isNull, or, type SQL } from "drizzle-orm";
import { activities, municipalities, placeActivities, places, placeTypes } from "@db/schema";
import type { Db } from "@/lib/db";
import type { CatalogItem } from "@/modules/catalogs/types";
import type { Difficulty, Origin, PlaceFilters } from "./types";

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

/** Published sites matching the filters, by name, with their activities. */
export async function findPlaces(db: Db, filters: PlaceFilters): Promise<PlaceRow[]> {
  const rows = await db
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
    .where(and(...filterConditions(db, filters)))
    .orderBy(asc(places.name), asc(places.id));
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
