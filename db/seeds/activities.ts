import { and, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { activities, placeTypeActivities, placeTypes } from "@db/schema";
import type { ActivityRule } from "@/modules/catalogs/activities";
import { osmTagSelectorSchema } from "@/modules/catalogs/osm-tags";
import { emptySeedResult, recordUpsert, type SeedDb, type SeedResult } from "./common";

export interface ActivitySource extends ActivityRule {
  name: string;
}

// Activities (HU-12) in display order, with their derivation rules. Rules stay conservative:
// a wrong activity misleads visitors, a missing one can be added by the community.
export const ACTIVITIES: readonly ActivitySource[] = [
  {
    slug: "senderismo",
    name: "Senderismo",
    placeTypes: ["sendero", "cerro", "reserva-natural"],
    // sac_scale grades mountain paths; route=hiking marks hiking routes.
    osmTags: [{ sac_scale: "*" }, { route: "hiking" }],
  },
  {
    slug: "bano-en-rio",
    name: "Baño en río",
    // Not every river or waterfall is safe to swim in: only explicit bathing places.
    placeTypes: ["balneario"],
    osmTags: [{ sport: "swimming" }],
  },
  {
    slug: "avistamiento-de-aves",
    name: "Avistamiento de aves",
    placeTypes: ["reserva-natural"],
    osmTags: [{ leisure: "bird_hide" }],
  },
  {
    slug: "camping",
    name: "Camping",
    placeTypes: [],
    osmTags: [{ tourism: "camp_site" }],
  },
  {
    slug: "ciclismo",
    name: "Ciclismo",
    placeTypes: [],
    osmTags: [
      { "mtb:scale": "*" },
      { route: "mtb" },
      { route: "bicycle" },
      { bicycle: "designated" },
    ],
  },
  {
    slug: "fotografia",
    name: "Fotografía",
    placeTypes: ["mirador", "cascada"],
    // Peaks and other sites that are also tagged as viewpoints.
    osmTags: [{ tourism: "viewpoint" }],
  },
  {
    slug: "plan-familiar",
    name: "Plan familiar",
    placeTypes: ["balneario", "playa"],
    osmTags: [{ tourism: "picnic_site" }],
  },
];

const activityTagsSchema = z.array(osmTagSelectorSchema);

/**
 * Upserts every activity by slug and syncs its place type rules with the configuration
 * (rules removed from the list are deleted). Place types must be seeded first.
 */
export async function seedActivities(db: SeedDb): Promise<SeedResult> {
  const result = emptySeedResult();
  const typeRows = await db.select({ id: placeTypes.id, slug: placeTypes.slug }).from(placeTypes);
  const typeIds = new Map(typeRows.map((t) => [t.slug, t.id]));

  for (const [index, activity] of ACTIVITIES.entries()) {
    const osmTags = activityTagsSchema.parse(activity.osmTags);
    const ruleTypeIds = activity.placeTypes.map((slug) => {
      const id = typeIds.get(slug);
      if (id === undefined)
        throw new Error(`Activity ${activity.slug}: unknown place type ${slug}`);
      return id;
    });

    const rows = await db
      .insert(activities)
      .values({ slug: activity.slug, name: activity.name, sortOrder: index + 1, osmTags })
      .onConflictDoUpdate({
        target: activities.slug,
        set: {
          name: sql`excluded.name`,
          sortOrder: sql`excluded.sort_order`,
          osmTags: sql`excluded.osm_tags`,
          updatedAt: sql`now()`,
        },
        // Skip the write when nothing changed, so updated_at reflects real data changes.
        setWhere: sql`(${activities.name}, ${activities.sortOrder}, ${activities.osmTags})
          IS DISTINCT FROM (excluded.name, excluded.sort_order, excluded.osm_tags)`,
      })
      .returning({ id: activities.id, inserted: sql<boolean>`(xmax = 0)` });

    const activityId = rows[0]?.id ?? (await findActivityId(db, activity.slug));
    const rulesChanged = await syncTypeRules(db, activityId, ruleTypeIds);

    if (rows.length === 0 && rulesChanged) result.updated.push(activity.slug);
    else recordUpsert(result, activity.slug, rows);
  }

  return result;
}

async function findActivityId(db: SeedDb, slug: string): Promise<number> {
  const [row] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.slug, slug));
  if (!row) throw new Error(`Activity ${slug} not found after upsert`);
  return row.id;
}

/** Makes the activity's place type rules exactly `typeIds`; returns whether anything changed. */
async function syncTypeRules(db: SeedDb, activityId: number, typeIds: number[]): Promise<boolean> {
  const removed = await db
    .delete(placeTypeActivities)
    .where(
      and(
        eq(placeTypeActivities.activityId, activityId),
        typeIds.length > 0 ? notInArray(placeTypeActivities.placeTypeId, typeIds) : undefined,
      ),
    )
    .returning({ placeTypeId: placeTypeActivities.placeTypeId });

  const added =
    typeIds.length === 0
      ? []
      : await db
          .insert(placeTypeActivities)
          .values(typeIds.map((placeTypeId) => ({ placeTypeId, activityId })))
          .onConflictDoNothing()
          .returning({ placeTypeId: placeTypeActivities.placeTypeId });

  return removed.length > 0 || added.length > 0;
}
