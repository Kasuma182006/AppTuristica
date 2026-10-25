import { and, eq } from "drizzle-orm";
import { places, placeTypes } from "@db/schema";
import type { IngestDb } from "../db";
import { distanceM, DUPLICATE_DISTANCE_M, similarNames } from "./dedup";
import type { Discarded, Point, ValidSite } from "./types";

/** A published community site, the kind ingest must never duplicate nor modify. */
export interface CommunitySite {
  name: string;
  placeTypeSlug: string;
  point: Point;
}

/** Published community sites; hidden ones show nowhere, so they cannot be duplicated. */
export async function loadCommunitySites(db: IngestDb): Promise<CommunitySite[]> {
  const rows = await db
    .select({ name: places.name, placeTypeSlug: placeTypes.slug, location: places.location })
    .from(places)
    .innerJoin(placeTypes, eq(places.placeTypeId, placeTypes.id))
    .where(and(eq(places.origin, "community"), eq(places.status, "published")));
  return rows.map((row) => ({
    name: row.name,
    placeTypeSlug: row.placeTypeSlug,
    point: { lat: row.location.lat, lon: row.location.lng },
  }));
}

/** Same rule as in-run duplicates (HU-26): same type, similar names, closer than 200 m. */
function isSamePlace(site: ValidSite, community: CommunitySite): boolean {
  return (
    site.placeTypeSlug === community.placeTypeSlug &&
    similarNames(site.name, community.name) &&
    distanceM(site.point, community.point) < DUPLICATE_DISTANCE_M
  );
}

/**
 * Leaves out the sites that a published community site already shows (HU-31): the community site
 * stays as it is and the OSM one is not created (or, if saved before, stops being seen).
 */
export function discardCommunityDuplicates<T extends ValidSite>(
  sites: readonly T[],
  community: readonly CommunitySite[],
): { kept: T[]; discarded: Discarded[] } {
  const kept: T[] = [];
  const discarded: Discarded[] = [];
  for (const site of sites) {
    if (community.some((c) => isSamePlace(site, c))) {
      discarded.push({
        externalIds: site.elements.map((e) => e.externalId),
        name: site.name,
        reason: "community-duplicate",
      });
    } else kept.push(site);
  }
  return { kept, discarded };
}
