import { asc } from "drizzle-orm";
import { placeTypes } from "@db/schema";
import { DEPARTMENTS } from "@db/seeds/departments";
import { osmTagSelectorsSchema, type OsmTagSelector } from "@/modules/catalogs/osm-tags";
import type { IngestDb } from "../../db";
import type { IngestSource } from "../types";
import { parseOverpassEndpoints, queryOverpass, type OsmElement } from "./overpass";
import { areaIdForRelation, buildOverpassQuery } from "./query";

// The whole Valle takes ~1 min on a busy server; the request limit leaves room for the response.
const QUERY_TIMEOUT_SECONDS = 300;
const REQUEST_TIMEOUT_MS = (QUERY_TIMEOUT_SECONDS + 60) * 1000;

/** Tag selectors of every place type (HU-11), validated: the jsonb column is external input. */
export async function loadTagSelectors(db: IngestDb): Promise<OsmTagSelector[]> {
  const rows = await db
    .select({ slug: placeTypes.slug, osmTags: placeTypes.osmTags })
    .from(placeTypes)
    .orderBy(asc(placeTypes.sortOrder), asc(placeTypes.id));
  if (rows.length === 0) throw new Error("place_types is empty: run `npm run db:seed` first");

  return rows.flatMap((row) => {
    const parsed = osmTagSelectorsSchema.safeParse(row.osmTags);
    if (!parsed.success) throw new Error(`Invalid osm_tags for place type "${row.slug}"`);
    return parsed.data;
  });
}

export function summarizeElements(elements: readonly OsmElement[]): string {
  const count = (type: OsmElement["type"]) => elements.filter((e) => e.type === type).length;
  const withoutPoint = elements.filter((e) => e.point === null).length;
  return (
    `${elements.length} elements (${count("node")} nodes, ${count("way")} ways, ` +
    `${count("relation")} relations; ${withoutPoint} without a point)`
  );
}

// Tourist sites from OpenStreetMap, for every department in scope. Normalization and the rest of
// the pipeline arrive in HU-22 onwards.
export const osmSource: IngestSource = {
  name: "osm",
  description: "sitios de OpenStreetMap",
  async run({ db }) {
    const selectors = await loadTagSelectors(db);
    const areaIds = DEPARTMENTS.map((d) => areaIdForRelation(d.osmRelationId));
    const query = buildOverpassQuery(selectors, areaIds, QUERY_TIMEOUT_SECONDS);

    const elements = await queryOverpass(query, {
      endpoints: parseOverpassEndpoints(process.env.OVERPASS_URLS),
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });
    console.log(`osm: fetched ${summarizeElements(elements)}`);
  },
};
