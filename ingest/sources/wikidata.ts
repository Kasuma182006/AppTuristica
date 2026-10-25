import { z } from "zod";
import type { EnrichedSite, RestrictedSite, WikidataInfo } from "../pipeline/types";
import { assertNoApiError, getWikimediaJson, type WikimediaOptions } from "./wikimedia";

// Enrichment step of the `osm` run (HU-27), not a source of its own: sites whose OSM data links a
// Wikidata item get its Spanish short description (CC0) and Spanish Wikipedia article, plus its
// image and Commons category, which HU-28 uses to find photos.

const API_URL = "https://www.wikidata.org/w/api.php";
// wbgetentities accepts at most 50 ids per request.
const MAX_IDS_PER_REQUEST = 50;
// Wikidata properties: image (P18) and Commons category (P373), both plain strings.
const IMAGE_PROPERTY = "P18";
const COMMONS_CATEGORY_PROPERTY = "P373";

const claimSchema = z.object({
  mainsnak: z.object({ datavalue: z.object({ value: z.unknown() }).optional() }),
});

const entitySchema = z.object({
  id: z.string(),
  missing: z.string().optional(),
  descriptions: z.record(z.string(), z.object({ value: z.string() })).optional(),
  sitelinks: z.record(z.string(), z.object({ url: z.string().optional() })).optional(),
  claims: z.record(z.string(), z.array(claimSchema)).optional(),
  // Present when the requested id was merged into another item.
  redirects: z.object({ from: z.string(), to: z.string() }).optional(),
});

const responseSchema = z.object({ entities: z.record(z.string(), entitySchema).optional() });

/** The first string value of a property, e.g. the file name in P18. */
function firstString(
  claims: z.infer<typeof entitySchema>["claims"],
  property: string,
): string | null {
  for (const claim of claims?.[property] ?? []) {
    const value = claim.mainsnak.datavalue?.value;
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

/** Parses a wbgetentities response into Spanish data by requested id; missing items are left out. */
export function parseEntities(body: unknown): Map<string, WikidataInfo> {
  assertNoApiError(body);
  const response = responseSchema.parse(body);
  const result = new Map<string, WikidataInfo>();
  for (const entity of Object.values(response.entities ?? {})) {
    if (entity.missing !== undefined) continue;
    const description = entity.descriptions?.es?.value.trim() || null;
    const url = entity.sitelinks?.eswiki?.url ?? null;
    const wikipediaUrl =
      url !== null && url.startsWith("https://es.wikipedia.org/wiki/") ? url : null;
    const requestedId = entity.redirects?.from ?? entity.id;
    result.set(requestedId, {
      id: requestedId,
      description,
      wikipediaUrl,
      image: firstString(entity.claims, IMAGE_PROPERTY),
      commonsCategory: firstString(entity.claims, COMMONS_CATEGORY_PROPERTY),
    });
  }
  return result;
}

function requestUrl(ids: readonly string[]): string {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "descriptions|sitelinks/urls|claims",
    languages: "es",
    sitefilter: "eswiki",
    format: "json",
    // No `maxlag`: it is meant for edits, and Wikidata's lag stays above 5 s for hours, which made
    // every run fail. This is one small read per run.
  }).toString();
  return url.toString();
}

/** Spanish data of each Wikidata item, in batches of 50, retrying network errors, 429 and 5xx. */
export async function fetchWikidataItems(
  ids: readonly string[],
  options: WikimediaOptions = {},
): Promise<Map<string, WikidataInfo>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, WikidataInfo>();
  for (let start = 0; start < unique.length; start += MAX_IDS_PER_REQUEST) {
    const batch = unique.slice(start, start + MAX_IDS_PER_REQUEST);
    const items = await getWikimediaJson(requestUrl(batch), parseEntities, options);
    for (const [id, info] of items) result.set(id, info);
  }
  return result;
}

/** Adds each site's Wikidata data; sites without an item, or whose item is missing, get null. */
export function attachWikidata(
  sites: readonly RestrictedSite[],
  items: ReadonlyMap<string, WikidataInfo>,
): EnrichedSite[] {
  return sites.map((site) => ({
    ...site,
    wikidata: site.wikidataId === null ? null : (items.get(site.wikidataId) ?? null),
  }));
}

export function summarizeWikidata(sites: readonly EnrichedSite[]): string {
  const linked = sites.filter((s) => s.wikidata !== null);
  const described = linked.filter((s) => s.wikidata?.description !== null).length;
  const withArticle = linked.filter((s) => s.wikidata?.wikipediaUrl !== null).length;
  return (
    `${linked.length} sites with a Wikidata item ` +
    `(${described} with Spanish description, ${withArticle} with Spanish Wikipedia)`
  );
}
