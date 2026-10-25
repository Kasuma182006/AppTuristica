import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

// Overpass usage policy: identify the app; one query at a time.
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";

export const DEFAULT_OVERPASS_ENDPOINTS: readonly string[] = [
  "https://overpass-api.de/api/interpreter",
  // Fallbacks: overpass-api.de answers 406 to some networks, and every public server is busy at
  // times (HU-34). See README: the weekly run may move to a Geofabrik extract.
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Waits before each retry on the same endpoint; its length is the number of retries. */
export const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [10_000, 30_000, 60_000];

/** `OVERPASS_URLS` (comma-separated, tried in order) or the default endpoints. */
export function parseOverpassEndpoints(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") return [...DEFAULT_OVERPASS_ENDPOINTS];
  const urls = value
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url !== "");
  return z
    .array(z.url({ protocol: /^https?$/ }))
    .min(1)
    .parse(urls);
}

export const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/** Overpass reports a failed query (e.g. timeout) in `remark`; its elements are then incomplete. */
export function assertQueryCompleted(remark: string | undefined): void {
  if (remark !== undefined && /error/i.test(remark)) {
    throw new Error(`Overpass query failed: ${remark}`);
  }
}
const tags = z.record(z.string(), z.string()).optional();
const id = z.number().int().positive();

const overpassElementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("node"), id, tags, ...coordinates.shape }),
  // Ways and relations with no resolvable members come without a center.
  z.object({ type: z.literal("way"), id, tags, center: coordinates.optional() }),
  z.object({ type: z.literal("relation"), id, tags, center: coordinates.optional() }),
]);

const overpassResponseSchema = z.object({
  elements: z.array(overpassElementSchema),
  remark: z.string().optional(),
});

export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  tags: Record<string, string>;
  /** Node position, or center of a way/relation; null when Overpass could not compute it. */
  point: { lat: number; lon: number } | null;
}

/** Validates an Overpass JSON response. Throws if it is malformed or reports a query error. */
export function parseOverpassResponse(body: unknown): OsmElement[] {
  const response = overpassResponseSchema.parse(body);
  assertQueryCompleted(response.remark);
  return response.elements.map((element) => ({
    type: element.type,
    id: element.id,
    tags: element.tags ?? {},
    point:
      element.type === "node" ? { lat: element.lat, lon: element.lon } : (element.center ?? null),
  }));
}

export interface OverpassOptions {
  endpoints: readonly string[];
  retryDelaysMs?: readonly number[];
  /** Per-request limit; keep it above the query's own `[timeout:…]`. */
  requestTimeoutMs: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<unknown>;
  log?: (message: string) => void;
}

/** How a failed attempt is handled: retry the same endpoint, or move on to the next one. */
type Failure = { kind: "retry" | "next-endpoint"; message: string };
type Attempt<T> = { kind: "ok"; value: T } | Failure;

async function attempt<T>(
  endpoint: string,
  query: string,
  parse: (body: unknown) => T,
  options: Required<Pick<OverpassOptions, "fetch" | "requestTimeoutMs">>,
): Promise<Attempt<T>> {
  let response: Response;
  try {
    response = await options.fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(options.requestTimeoutMs),
    });
  } catch (error) {
    return { kind: "retry", message: `network error: ${errorMessage(error)}` };
  }

  // Blocked for this client (403/406): retrying the same endpoint will not help.
  if (response.status === 403 || response.status === 406) {
    return { kind: "next-endpoint", message: `HTTP ${response.status} (blocked)` };
  }
  if (response.status === 429 || response.status >= 500) {
    return { kind: "retry", message: `HTTP ${response.status}` };
  }
  if (!response.ok) {
    // 400 means a malformed query: every endpoint would reject it.
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Overpass rejected the query (HTTP ${response.status}): ${detail}`);
  }

  try {
    return { kind: "ok", value: parse(await response.json()) };
  } catch (error) {
    // Truncated bodies, HTML error pages with status 200, or a timeout reported in `remark`.
    return { kind: "retry", message: `invalid response: ${errorMessage(error)}` };
  }
}

/** Runs a query whose results are elements with tags and a point (`out tags center`). */
export function queryOverpass(query: string, options: OverpassOptions): Promise<OsmElement[]> {
  return queryOverpassWith(query, options, parseOverpassResponse);
}

/**
 * Runs an Overpass query, trying each endpoint in order, and parses the JSON body with `parse`
 * (a throw means an invalid response). Network errors, 429, 5xx and invalid responses are retried
 * on the same endpoint after each delay; 403/406 skip to the next endpoint. Throws once every
 * endpoint has failed, or right away if the query itself is rejected (4xx).
 */
export async function queryOverpassWith<T>(
  query: string,
  options: OverpassOptions,
  parse: (body: unknown) => T,
): Promise<T> {
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const doFetch = options.fetch ?? fetch;
  const wait = options.sleep ?? sleep;
  const log = options.log ?? console.log;
  const failures: string[] = [];

  for (const endpoint of options.endpoints) {
    for (let retry = 0; ; retry++) {
      const result = await attempt(endpoint, query, parse, {
        fetch: doFetch,
        requestTimeoutMs: options.requestTimeoutMs,
      });
      if (result.kind === "ok") return result.value;

      const delay = delays[retry];
      if (result.kind === "next-endpoint" || delay === undefined) {
        failures.push(`${endpoint}: ${result.message}`);
        log(`Overpass ${endpoint}: ${result.message}; giving up on this endpoint`);
        break;
      }
      log(`Overpass ${endpoint}: ${result.message}; retrying in ${delay / 1000}s`);
      await wait(delay);
    }
  }

  throw new Error(`Every Overpass endpoint failed:\n${failures.join("\n")}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
