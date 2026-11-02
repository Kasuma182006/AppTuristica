import { asc, eq, sql } from "drizzle-orm";
import { activities, departments, municipalities, placeTypes } from "@db/schema";
import type { Db } from "@/lib/db";
import type { Bounds, Catalogs, Municipality } from "./types";

/**
 * The area of each municipality's largest piece of land, by slug (HU-75). Buenaventura also owns
 * Malpelo island, ~500 km off the coast: its whole area would be mostly ocean.
 */
export async function findMunicipalityBounds(db: Db): Promise<Record<string, Bounds>> {
  const rows = await db
    .select({
      slug: municipalities.slug,
      bounds: sql<Bounds>`(
        SELECT ARRAY[ST_XMin(largest.geom), ST_YMin(largest.geom), ST_XMax(largest.geom), ST_YMax(largest.geom)]
        FROM (
          SELECT part.geom
          FROM ST_Dump(${municipalities.geom}) AS part
          ORDER BY ST_Area(part.geom) DESC
          LIMIT 1
        ) AS largest
      )`,
    })
    .from(municipalities);
  return Object.fromEntries(rows.map(({ slug, bounds }) => [slug, bounds]));
}

/** Every municipality, place type and activity, including those without published sites. */
export async function findCatalogs(db: Db): Promise<Catalogs> {
  const [municipalityRows, placeTypeRows, activityRows] = await Promise.all([
    db
      .select({ slug: municipalities.slug, name: municipalities.name })
      .from(municipalities)
      .orderBy(asc(municipalities.name), asc(municipalities.id)),
    db
      .select({ slug: placeTypes.slug, name: placeTypes.name })
      .from(placeTypes)
      .orderBy(asc(placeTypes.sortOrder), asc(placeTypes.id)),
    db
      .select({ slug: activities.slug, name: activities.name })
      .from(activities)
      .orderBy(asc(activities.sortOrder), asc(activities.id)),
  ]);

  return {
    municipalities: municipalityRows,
    placeTypes: placeTypeRows,
    activities: activityRows,
  };
}

/** A municipality by slug, with its department (HU-70); undefined when there is none. */
export async function findMunicipalityBySlug(
  db: Db,
  slug: string,
): Promise<Municipality | undefined> {
  const [row] = await db
    .select({ slug: municipalities.slug, name: municipalities.name, department: departments.name })
    .from(municipalities)
    .innerJoin(departments, eq(departments.id, municipalities.departmentId))
    .where(eq(municipalities.slug, slug))
    .limit(1);
  return row;
}
