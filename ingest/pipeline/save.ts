import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { photos, placeActivities, places, placeSources } from "@db/schema";
import type { IngestDb } from "../db";
import type {
  PlaceData,
  PlaceUpdate,
  SavePlan,
  SourceRef,
  StoredPlace,
  StoredState,
} from "./save-plan";

/**
 * Sources not found for this long are removed, and sites left without sources are deleted
 * (HU-31). Overpass servers answer with slightly different data, so a site missing from one run
 * must not disappear: 30 days are about four weekly runs.
 */
export const STALE_AFTER_DAYS = 30;

/** Open-data sites with their activities, sources and photos, and every slug in use. */
export async function loadStoredState(db: IngestDb): Promise<StoredState> {
  const placeRows = await db
    .select({
      id: places.id,
      status: places.status,
      name: places.name,
      placeTypeId: places.placeTypeId,
      municipalityId: places.municipalityId,
      location: places.location,
      description: places.description,
      wikidataDescription: places.wikidataDescription,
      wikipediaUrl: places.wikipediaUrl,
      difficulty: places.difficulty,
      altitudeM: places.altitudeM,
      cost: places.cost,
      sensitivity: places.sensitivity,
      inProtectedArea: places.inProtectedArea,
      privateProperty: places.privateProperty,
      confidence: places.confidence,
    })
    .from(places)
    .where(eq(places.origin, "open_data"));
  const slugRows = await db.select({ slug: places.slug }).from(places);
  const activityRows = await db.select().from(placeActivities);
  const sourceRows = await db
    .select({
      placeId: placeSources.placeId,
      source: placeSources.source,
      externalId: placeSources.externalId,
      url: placeSources.url,
    })
    .from(placeSources)
    .where(inArray(placeSources.source, ["openstreetmap", "wikidata"]));
  const photoRows = await db.select().from(photos).orderBy(photos.placeId, photos.sortOrder);

  const stored = new Map<number, StoredPlace>(
    placeRows.map(({ id, status, ...fields }) => [
      id,
      { id, status, fields, activityIds: [], sources: [], photos: [] },
    ]),
  );
  for (const row of activityRows) stored.get(row.placeId)?.activityIds.push(row.activityId);
  for (const row of sourceRows) {
    // The format checks guarantee both for OSM and Wikidata rows.
    if (row.externalId === null || row.url === null || row.source === "community") continue;
    stored
      .get(row.placeId)
      ?.sources.push({ source: row.source, externalId: row.externalId, url: row.url });
  }
  for (const row of photoRows) {
    stored.get(row.placeId)?.photos.push({
      url: row.url,
      author: row.author,
      license: row.license,
      licenseUrl: row.licenseUrl,
      sourceUrl: row.sourceUrl,
      width: row.width,
      height: row.height,
    });
  }
  return { places: stored, slugs: new Set(slugRows.map((row) => row.slug)) };
}

async function insertActivities(db: IngestDb, placeId: number, activityIds: readonly number[]) {
  if (activityIds.length === 0) return;
  await db
    .insert(placeActivities)
    .values(activityIds.map((activityId) => ({ placeId, activityId })));
}

async function insertPhotos(db: IngestDb, placeId: number, data: PlaceData) {
  if (data.photos.length === 0) return;
  await db.insert(photos).values(
    data.photos.map((photo, sortOrder) => ({
      placeId,
      ...photo,
      source: "wikimedia_commons" as const,
      sortOrder,
    })),
  );
}

/** Adds sources to a site; an OSM element that belonged to another site moves here. */
async function addSources(db: IngestDb, placeId: number, sources: readonly SourceRef[], now: Date) {
  const osm = sources.filter((s) => s.source === "openstreetmap");
  const wikidata = sources.filter((s) => s.source === "wikidata");
  if (osm.length > 0) {
    await db
      .insert(placeSources)
      .values(osm.map((s) => ({ placeId, ...s, lastSeenAt: now })))
      .onConflictDoUpdate({
        target: placeSources.externalId,
        targetWhere: sql`${placeSources.source} = 'openstreetmap'`,
        set: { placeId, lastSeenAt: now },
      });
  }
  if (wikidata.length > 0) {
    await db
      .insert(placeSources)
      .values(wikidata.map((s) => ({ placeId, ...s, lastSeenAt: now })))
      .onConflictDoNothing();
  }
}

async function createPlace(db: IngestDb, slug: string, data: PlaceData, now: Date) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(places)
      .values({ slug, origin: "open_data", ...data.fields, createdAt: now, updatedAt: now })
      .returning({ id: places.id });
    if (!row) throw new Error("Insert returned no row");
    await insertActivities(tx, row.id, data.activityIds);
    await insertPhotos(tx, row.id, data);
    await addSources(tx, row.id, data.sources, now);
  });
}

async function updatePlace(db: IngestDb, update: PlaceUpdate, now: Date) {
  const { id, data } = update;
  await db.transaction(async (tx) => {
    // The status only ever changes to hidden: ingest never reactivates a hidden site.
    if (update.contentChanged || update.hide) {
      await tx
        .update(places)
        .set({
          ...data.fields,
          updatedAt: now,
          ...(update.hide ? { status: "hidden" as const } : {}),
        })
        .where(eq(places.id, id));
    }
    if (update.activitiesChanged) {
      await tx.delete(placeActivities).where(eq(placeActivities.placeId, id));
      await insertActivities(tx, id, data.activityIds);
    }
    if (update.photosChanged) {
      await tx.delete(photos).where(eq(photos.placeId, id));
      await insertPhotos(tx, id, data);
    }
    await addSources(tx, id, update.newSources, now);
    if (update.droppedWikidataIds.length > 0) {
      await tx
        .delete(placeSources)
        .where(
          and(
            eq(placeSources.placeId, id),
            eq(placeSources.source, "wikidata"),
            inArray(placeSources.externalId, update.droppedWikidataIds),
          ),
        );
    }
    if (update.absorbedIds.length > 0) {
      await tx.delete(places).where(inArray(places.id, update.absorbedIds));
    }
  });
}

/** Marks the sources found in this run as seen; sources of a site the run missed are not. */
async function markSeen(
  db: IngestDb,
  seen: { placeId: number; sources: SourceRef[] }[],
  now: Date,
) {
  const rows = seen.flatMap(({ placeId, sources }) =>
    sources.map((s) => ({ place_id: placeId, source: s.source, external_id: s.externalId })),
  );
  if (rows.length === 0) return;
  await db.execute(sql`
    UPDATE ${placeSources} AS ps SET last_seen_at = ${now.toISOString()}::timestamptz
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS s(place_id int, source text, external_id text)
    WHERE ps.place_id = s.place_id AND ps.source::text = s.source
      AND ps.external_id = s.external_id
  `);
}

/** Removes stale sources, then the open-data sites left without any (HU-31). */
async function removeStale(db: IngestDb, now: Date): Promise<{ sources: number; places: number }> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const sources = await db
    .delete(placeSources)
    .where(
      and(
        inArray(placeSources.source, ["openstreetmap", "wikidata"]),
        lt(placeSources.lastSeenAt, cutoff),
      ),
    )
    .returning({ id: placeSources.id });
  const deleted = await db
    .delete(places)
    .where(
      and(
        eq(places.origin, "open_data"),
        sql`NOT EXISTS (SELECT 1 FROM ${placeSources} WHERE ${placeSources.placeId} = ${places.id})`,
      ),
    )
    .returning({ id: places.id });
  return { sources: sources.length, places: deleted.length };
}

export interface SaveResult {
  created: number;
  updated: number;
  unchanged: number;
  /** Older sites merged into another one and deleted. */
  absorbed: number;
  staleSources: number;
  stalePlaces: number;
  /** One message per site that could not be saved; the other sites are saved anyway. */
  errors: string[];
}

/** Writes the plan, one transaction per site, then refreshes last_seen_at and removes stale data. */
export async function applySavePlan(db: IngestDb, plan: SavePlan, now: Date): Promise<SaveResult> {
  const errors: string[] = [];
  const seen: { placeId: number; sources: SourceRef[] }[] = [];
  let created = 0;
  let updated = 0;
  let absorbed = 0;

  for (const { slug, data } of plan.creates) {
    try {
      await createPlace(db, slug, data, now);
      created++;
    } catch (error) {
      errors.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const update of plan.updates) {
    try {
      await updatePlace(db, update, now);
      seen.push({ placeId: update.id, sources: update.data.sources });
      updated++;
      absorbed += update.absorbedIds.length;
    } catch (error) {
      errors.push(`site ${update.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const { id, sources } of plan.unchanged) seen.push({ placeId: id, sources });
  await markSeen(db, seen, now);
  const stale = await removeStale(db, now);
  return {
    created,
    updated,
    unchanged: plan.unchanged.length,
    absorbed,
    staleSources: stale.sources,
    stalePlaces: stale.places,
    errors,
  };
}

/** e.g. "saved: 539 created, 0 updated, 0 unchanged; removed 0 stale sources and 0 sites". */
export function summarizeSave(result: SaveResult): string {
  const merged = result.absorbed > 0 ? `, ${result.absorbed} merged into older sites` : "";
  const errors = result.errors.length > 0 ? `; ${result.errors.length} errors` : "";
  return (
    `saved: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged` +
    `${merged}; removed ${result.staleSources} stale sources and ${result.stalePlaces} sites${errors}`
  );
}
