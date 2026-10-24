import { DEPARTMENTS } from "@db/seeds/departments";
import { loadCatalog } from "../../catalog";
import { assignMunicipalities } from "../../pipeline/municipality";
import { applyRestrictions, findPointsInAreas } from "../../pipeline/restrictions";
import type { CandidatePlace, LocatedCandidate, RestrictedSite } from "../../pipeline/types";
import { discardInvalid, formatDiscarded, summarizeDiscarded } from "../../pipeline/validate";
import type { IngestSource } from "../types";
import { normalizeOsmElement } from "./normalize";
import { parseOverpassEndpoints, queryOverpass, queryOverpassWith } from "./overpass";
import { buildProtectedAreasQuery, isProtectedArea, parseProtectedAreas } from "./protected-areas";
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

export function summarizeRestrictions(sites: readonly RestrictedSite[]): string {
  const fragile = sites.filter((s) => s.inProtectedArea).length;
  const privateProperty = sites.filter((s) => s.privateProperty).length;
  return `${fragile} in protected areas (fragile), ${privateProperty} private property`;
}

// Tourist sites from OpenStreetMap, for every department in scope. Deduplication and the rest of
// the pipeline arrive in HU-26 onwards.
export const osmSource: IngestSource = {
  name: "osm",
  description: "sitios de OpenStreetMap",
  async run({ db }) {
    const catalog = await loadCatalog(db);
    const selectors = catalog.placeTypes.flatMap((type) => type.osmTags);
    const areaIds = DEPARTMENTS.map((d) => areaIdForRelation(d.osmRelationId));
    const query = buildOverpassQuery(selectors, areaIds, QUERY_TIMEOUT_SECONDS);

    const overpass = {
      endpoints: parseOverpassEndpoints(process.env.OVERPASS_URLS),
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    };
    const elements = await queryOverpass(query, overpass);
    console.log(`osm: fetched ${elements.length} elements`);
    const protectedAreas = await queryOverpassWith(
      buildProtectedAreasQuery(areaIds, QUERY_TIMEOUT_SECONDS),
      overpass,
      parseProtectedAreas,
    );
    console.log(`osm: fetched ${protectedAreas.length} protected areas`);

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

    const inside = await findPointsInAreas(
      db,
      protectedAreas,
      valid.map((site) => site.point),
    );
    const restricted = valid.map((site, i) =>
      applyRestrictions(site, inside[i] ?? false, isProtectedArea),
    );
    console.log(`osm: ${summarizeRestrictions(restricted)}`);
  },
};
