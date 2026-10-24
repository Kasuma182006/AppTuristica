import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import type { EnrichedSite, RestrictedSite, WikidataInfo } from "../pipeline/types";

// Enrichment step of the `osm` run (HU-27), not a source of its own: sites whose OSM data links a
// Wikidata item get its Spanish short description (CC0) and Spanish Wikipedia article.

const API_URL = "https://www.wikidata.org/w/api.php";
// Wikimedia's User-Agent policy asks for a way to reach the operator: the app's URL.
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";
// wbgetentities accepts at most 50 ids per request.
const MAX_IDS_PER_REQUEST = 50;
const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 45_000];
const REQUEST_TIMEOUT_MS = 60_000;

const entitySchema = z.object({
  id: z.string(),
  missing: z.string().optional(),
  descriptions: z.record(z.string(), z.object({ value: z.string() })).optional(),
  sitelinks: z.record(z.string(), z.object({ url: z.string().optional() })).optional(),
  // Present when the requested id was merged into another item.
  redirects: z.object({ from: z.string(), to: z.string() }).optional(),
});

const responseSchema = z.object({
  entities: z.record(z.string(), entitySchema).optional(),
  // API errors (e.g. maxlag) come with HTTP 200.
  error: z.object({ code: z.string(), info: z.string().optional() }).optional(),
});

/** Parses a wbgetentities response into Spanish data by requested id; missing items are left out. */
export function parseEntities(body: unknown): Map<string, WikidataInfo> {
  const response = responseSchema.parse(body);
  if (response.error) {
    throw new Error(`Wikidata API error: ${response.error.code} ${response.error.info ?? ""}`);
  }
  const result = new Map<string, WikidataInfo>();
  for (const entity of Object.values(response.entities ?? {})) {
    if (entity.missing !== undefined) continue;
    const description = entity.descriptions?.es?.value.trim() || null;
    const url = entity.sitelinks?.eswiki?.url ?? null;
    const wikipediaUrl =
      url !== null && url.startsWith("https://es.wikipedia.org/wiki/") ? url : null;
    const requestedId = entity.redirects?.from ?? entity.id;
    result.set(requestedId, { id: requestedId, description, wikipediaUrl });
  }
  return result;
}

export interface WikidataOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<unknown>;
  retryDelaysMs?: readonly number[];
  log?: (message: string) => void;
}

function requestUrl(ids: readonly string[]): string {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "descriptions|sitelinks/urls",
    languages: "es",
    sitefilter: "eswiki",
    format: "json",
    // No `maxlag`: it is meant for edits, and Wikidata's lag stays above 5 s for hours, which made
    // every run fail. This is one small read per run.
  }).toString();
  return url.toString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One request: the parsed items, or a failure worth retrying. A 4xx means a bad request: throws. */
async function attemptBatch(
  ids: readonly string[],
  doFetch: typeof fetch,
): Promise<Map<string, WikidataInfo> | { failure: string }> {
  let response: Response;
  try {
    response = await doFetch(requestUrl(ids), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { failure: `network error: ${errorMessage(error)}` };
  }
  if (response.status === 429 || response.status >= 500) {
    return { failure: `HTTP ${response.status}` };
  }
  if (!response.ok) throw new Error(`Wikidata rejected the request (HTTP ${response.status})`);
  try {
    return parseEntities(await response.json());
  } catch (error) {
    // Includes API errors, which Wikidata reports with status 200.
    return { failure: `invalid response: ${errorMessage(error)}` };
  }
}

async function fetchBatch(ids: readonly string[], options: WikidataOptions) {
  const doFetch = options.fetch ?? fetch;
  const wait = options.sleep ?? sleep;
  const log = options.log ?? console.log;
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;

  for (let retry = 0; ; retry++) {
    const result = await attemptBatch(ids, doFetch);
    if (result instanceof Map) return result;
    const delay = delays[retry];
    if (delay === undefined) throw new Error(`Wikidata request failed: ${result.failure}`);
    log(`Wikidata: ${result.failure}; retrying in ${delay / 1000}s`);
    await wait(delay);
  }
}

/** Spanish data of each Wikidata item, in batches of 50, retrying network errors, 429 and 5xx. */
export async function fetchWikidataItems(
  ids: readonly string[],
  options: WikidataOptions = {},
): Promise<Map<string, WikidataInfo>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, WikidataInfo>();
  for (let start = 0; start < unique.length; start += MAX_IDS_PER_REQUEST) {
    const batch = await fetchBatch(unique.slice(start, start + MAX_IDS_PER_REQUEST), options);
    for (const [id, info] of batch) result.set(id, info);
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
