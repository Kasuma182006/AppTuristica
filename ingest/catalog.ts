import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  activities,
  departments,
  municipalities,
  placeTypeActivities,
  placeTypes,
} from "@db/schema";
import type { ActivityRule } from "@/modules/catalogs/activities";
import {
  osmTagSelectorSchema,
  osmTagSelectorsSchema,
  type OsmTagSelector,
} from "@/modules/catalogs/osm-tags";
import type { IngestDb } from "./db";

export interface CatalogPlaceType {
  id: number;
  slug: string;
  osmTags: OsmTagSelector[];
}

/** A municipality with its department, as written in descriptions, and its slug. */
export interface CatalogMunicipality {
  name: string;
  slug: string;
  departmentName: string;
}

/**
 * Reference data from the database: classification rules for place types (HU-11) and
 * activities (HU-12), municipality names for descriptions (HU-29) and slugs (HU-31).
 */
export interface Catalog {
  /** In priority order: the first type whose tags match wins. */
  placeTypes: CatalogPlaceType[];
  /** In display order. */
  activityRules: ActivityRule[];
  /** Activity ids by slug, to save the activities of each site (HU-31). */
  activityIds: ReadonlyMap<string, number>;
  /** By municipality id. */
  municipalities: ReadonlyMap<number, CatalogMunicipality>;
}

const activityTagsSchema = z.array(osmTagSelectorSchema);

/** Loads the catalog, validating the jsonb columns (external input). */
export async function loadCatalog(db: IngestDb): Promise<Catalog> {
  const typeRows = await db
    .select({ id: placeTypes.id, slug: placeTypes.slug, osmTags: placeTypes.osmTags })
    .from(placeTypes)
    .orderBy(asc(placeTypes.sortOrder), asc(placeTypes.id));
  if (typeRows.length === 0) throw new Error("place_types is empty: run `npm run db:seed` first");

  const activityRows = await db
    .select({ id: activities.id, slug: activities.slug, osmTags: activities.osmTags })
    .from(activities)
    .orderBy(asc(activities.sortOrder), asc(activities.id));

  const typeRuleRows = await db
    .select({ activity: activities.slug, placeType: placeTypes.slug })
    .from(placeTypeActivities)
    .innerJoin(activities, eq(placeTypeActivities.activityId, activities.id))
    .innerJoin(placeTypes, eq(placeTypeActivities.placeTypeId, placeTypes.id));

  const municipalityRows = await db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      slug: municipalities.slug,
      departmentName: departments.name,
    })
    .from(municipalities)
    .innerJoin(departments, eq(municipalities.departmentId, departments.id));

  return {
    placeTypes: typeRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      osmTags: parseTags(osmTagSelectorsSchema, row.osmTags, `place type "${row.slug}"`),
    })),
    activityRules: activityRows.map((row) => ({
      slug: row.slug,
      placeTypes: typeRuleRows.filter((r) => r.activity === row.slug).map((r) => r.placeType),
      osmTags: parseTags(activityTagsSchema, row.osmTags, `activity "${row.slug}"`),
    })),
    activityIds: new Map(activityRows.map((row) => [row.slug, row.id])),
    municipalities: new Map(
      municipalityRows.map((row) => [
        row.id,
        { name: row.name, slug: row.slug, departmentName: row.departmentName },
      ]),
    ),
  };
}

function parseTags(schema: z.ZodType<OsmTagSelector[]>, value: unknown, owner: string) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid osm_tags for ${owner}`);
  return parsed.data;
}
