import { DEPARTMENTS } from "@db/seeds/departments";
import { loadCatalog } from "../../catalog";
import { assignMunicipalities } from "../../pipeline/municipality";
import type { CandidatePlace, LocatedCandidate } from "../../pipeline/types";
import { discardInvalid, formatDiscarded, summarizeDiscarded } from "../../pipeline/validate";
import type { IngestSource } from "../types";
import { normalizeOsmElement } from "./normalize";
import { parseOverpassEndpoints, queryOverpass } from "./overpass";
import { areaIdForRelation, buildOverpassQuery } from "./query";
import { groupRiverSegments, RIVER_TYPE_SLUG } from "./rivers";

// The whole Valle takes ~1 min on a busy server; the request limit leaves room for the response.
const QUERY_TIMEOUT_SECONDS = 300;
const REQUEST_TIMEOUT_MS = (QUERY_TIMEOUT_SECONDS + 60) * 1000;

export function summarizeNormalization(candidates: readonly CandidatePlace[]): string {
  const rivers = candidates.filter((c) => c.placeTypeSlug === RIVER_TYPE_SLUG && c.name !== null);
  const segments = rivers.reduce((total, river) => total + river.elements.length, 0);
  return `${candidates.length} candidates (${rivers.length} named rivers from ${segments} segments)`;
}

export function summarizeLocation(sites: readonly LocatedCandidate[]): string {
  const withoutMunicipality = sites.filter((s) => s.municipalityId === null).length;
  const riverSites = sites.filter(
    (s) => s.placeTypeSlug === RIVER_TYPE_SLUG && s.name !== null && s.municipalityId !== null,
  ).length;
  return (
    `${sites.length} sites after municipality assignment ` +
    `(${riverSites} named river sites; ${withoutMunicipality} without municipality)`
  );
}

// Tourist sites from OpenStreetMap, for every department in scope. Access restrictions and the
// rest of the pipeline arrive in HU-25 onwards.
export const osmSource: IngestSource = {
  name: "osm",
  description: "sitios de OpenStreetMap",
  async run({ db }) {
    const catalog = await loadCatalog(db);
    const selectors = catalog.placeTypes.flatMap((type) => type.osmTags);
    const areaIds = DEPARTMENTS.map((d) => areaIdForRelation(d.osmRelationId));
    const query = buildOverpassQuery(selectors, areaIds, QUERY_TIMEOUT_SECONDS);

    const elements = await queryOverpass(query, {
      endpoints: parseOverpassEndpoints(process.env.OVERPASS_URLS),
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });
    console.log(`osm: fetched ${elements.length} elements`);

    const grouped = groupRiverSegments(
      elements.map((element) => normalizeOsmElement(element, catalog)),
      catalog.activityRules.map((rule) => rule.slug),
    );
    console.log(`osm: ${summarizeNormalization(grouped.candidates)}`);

    const sites = await assignMunicipalities(db, grouped.candidates);
    console.log(`osm: ${summarizeLocation(sites)}`);

    const { valid, discarded: invalid } = discardInvalid(sites);
    const discarded = [...grouped.discarded, ...invalid];
    console.log(
      `osm: ${valid.length} valid sites; ${discarded.length} discarded (${summarizeDiscarded(discarded)})`,
    );
    for (const item of discarded) console.log(`osm: discarded ${formatDiscarded(item)}`);
  },
};
