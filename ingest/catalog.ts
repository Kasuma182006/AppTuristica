import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { activities, placeTypeActivities, placeTypes } from "@db/schema";
import type { ActivityRule } from "@/modules/catalogs/activities";
import {
  osmTagSelectorSchema,
  osmTagSelectorsSchema,
  type OsmTagSelector,
} from "@/modules/catalogs/osm-tags";
import type { IngestDb } from "./db";

export interface CatalogPlaceType {
  slug: string;
  osmTags: OsmTagSelector[];
}

/** Classification rules from the database: place types (HU-11) and activities (HU-12). */
export interface Catalog {
  /** In priority order: the first type whose tags match wins. */
  placeTypes: CatalogPlaceType[];
  /** In display order. */
  activityRules: ActivityRule[];
}

const activityTagsSchema = z.array(osmTagSelectorSchema);

/** Loads the catalog, validating the jsonb columns (external input). */
export async function loadCatalog(db: IngestDb): Promise<Catalog> {
  const typeRows = await db
    .select({ slug: placeTypes.slug, osmTags: placeTypes.osmTags })
    .from(placeTypes)
    .orderBy(asc(placeTypes.sortOrder), asc(placeTypes.id));
  if (typeRows.length === 0) throw new Error("place_types is empty: run `npm run db:seed` first");

  const activityRows = await db
    .select({ slug: activities.slug, osmTags: activities.osmTags })
    .from(activities)
    .orderBy(asc(activities.sortOrder), asc(activities.id));

  const typeRuleRows = await db
    .select({ activity: activities.slug, placeType: placeTypes.slug })
    .from(placeTypeActivities)
    .innerJoin(activities, eq(placeTypeActivities.activityId, activities.id))
    .innerJoin(placeTypes, eq(placeTypeActivities.placeTypeId, placeTypes.id));

  return {
    placeTypes: typeRows.map((row) => ({
      slug: row.slug,
      osmTags: parseTags(osmTagSelectorsSchema, row.osmTags, `place type "${row.slug}"`),
    })),
    activityRules: activityRows.map((row) => ({
      slug: row.slug,
      placeTypes: typeRuleRows.filter((r) => r.activity === row.slug).map((r) => r.placeType),
      osmTags: parseTags(activityTagsSchema, row.osmTags, `activity "${row.slug}"`),
    })),
  };
}

function parseTags(schema: z.ZodType<OsmTagSelector[]>, value: unknown, owner: string) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid osm_tags for ${owner}`);
  return parsed.data;
}
