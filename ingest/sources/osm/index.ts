import { DEPARTMENTS } from "@db/seeds/departments";
import { loadCatalog } from "../../catalog";
import { assignMunicipalities } from "../../pipeline/municipality";
import type { CandidatePlace, DiscardedElement, LocatedCandidate } from "../../pipeline/types";
import type { IngestSource } from "../types";
import { normalizeOsmElement } from "./normalize";
import { parseOverpassEndpoints, queryOverpass } from "./overpass";
import { areaIdForRelation, buildOverpassQuery } from "./query";
import { groupRiverSegments, RIVER_TYPE_SLUG } from "./rivers";

// The whole Valle takes ~1 min on a busy server; the request limit leaves room for the response.
const QUERY_TIMEOUT_SECONDS = 300;
const REQUEST_TIMEOUT_MS = (QUERY_TIMEOUT_SECONDS + 60) * 1000;

export function summarizeNormalization(
  candidates: readonly CandidatePlace[],
  discarded: readonly DiscardedElement[],
): string {
  const rivers = candidates.filter((c) => c.placeTypeSlug === RIVER_TYPE_SLUG && c.name !== null);
  const segments = rivers.reduce((total, river) => total + river.elements.length, 0);
  const reasons = new Map<string, number>();
  for (const d of discarded) reasons.set(d.reason, (reasons.get(d.reason) ?? 0) + 1);
  const discardedText = [...reasons].map(([reason, count]) => `${reason}: ${count}`).join(", ");
  return (
    `${candidates.length} candidates (${rivers.length} named rivers from ${segments} segments); ` +
    `${discarded.length} discarded${discardedText ? ` (${discardedText})` : ""}`
  );
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

// Tourist sites from OpenStreetMap, for every department in scope. Validation and the rest of
// the pipeline arrive in HU-24 onwards.
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

    const { candidates, discarded } = groupRiverSegments(
      elements.map((element) => normalizeOsmElement(element, catalog)),
      catalog.activityRules.map((rule) => rule.slug),
    );
    console.log(`osm: ${summarizeNormalization(candidates, discarded)}`);

    const sites = await assignMunicipalities(db, candidates);
    console.log(`osm: ${summarizeLocation(sites)}`);
  },
};
