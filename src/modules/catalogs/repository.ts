import { asc } from "drizzle-orm";
import { activities, municipalities, placeTypes } from "@db/schema";
import type { Db } from "@/lib/db";
import type { Catalogs } from "./types";

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
