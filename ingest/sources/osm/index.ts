import { DEPARTMENTS } from "@db/seeds/departments";
import { loadCatalog } from "../../catalog";
import { scoreSites, summarizeConfidence } from "../../pipeline/confidence";
import { deduplicate, formatMerge } from "../../pipeline/dedup";
import { describeSites } from "../../pipeline/describe";
import { assignMunicipalities, locatePoints } from "../../pipeline/municipality";
import { applyRestrictions, findContainingAreas } from "../../pipeline/restrictions";
import type { CandidatePlace, LocatedCandidate, RestrictedSite } from "../../pipeline/types";
import { discardInvalid, formatDiscarded, summarizeDiscarded } from "../../pipeline/validate";
import { attachPhotos, summarizePhotos } from "../commons";
import type { IngestSource } from "../types";
import { attachWikidata, fetchWikidataItems, summarizeWikidata } from "../wikidata";
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

// Tourist sites from OpenStreetMap, for every department in scope. Saving them arrives in HU-31.
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

    const containing = (
      await findContainingAreas(
        db,
        protectedAreas,
        valid.map((site) => site.point),
      )
    ).map((indexes) => indexes.flatMap((i) => protectedAreas[i]?.externalId ?? []));
    const restricted = valid.map((site, i) =>
      applyRestrictions(site, (containing[i] ?? []).length > 0, isProtectedArea),
    );
    console.log(`osm: ${summarizeRestrictions(restricted)}`);

    const deduplicated = deduplicate(restricted, {
      activityOrder: catalog.activityRules.map((rule) => rule.slug),
      containingAreas: containing,
    });
    console.log(
      `osm: ${deduplicated.sites.length} sites after deduplication ` +
        `(${deduplicated.merges.length} merges)`,
    );
    for (const merge of deduplicated.merges) console.log(`osm: merged ${formatMerge(merge)}`);

    const wikidataIds = deduplicated.sites.flatMap((s) => (s.wikidataId ? [s.wikidataId] : []));
    const enriched = attachWikidata(deduplicated.sites, await fetchWikidataItems(wikidataIds));
    console.log(`osm: ${summarizeWikidata(enriched)}`);

    // A photo is taken in scope when it falls in a municipality (with the border tolerance).
    const withPhotos = await attachPhotos(enriched, async (points) =>
      (await locatePoints(db, points)).map((location) => location?.municipalityId ?? null),
    );
    console.log(`osm: ${summarizePhotos(withPhotos)}`);

    const described = describeSites(withPhotos, catalog.municipalities);
    // One example per type, to review the templates in the run log.
    const examples = new Map(described.map((site) => [site.placeTypeSlug, site]));
    for (const site of examples.values()) {
      console.log(`osm: description of ${site.name}: ${site.description}`);
    }

    const scored = scoreSites(described);
    console.log(`osm: ${summarizeConfidence(scored)}`);
  },
};
