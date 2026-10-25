import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

// Shared client for Wikimedia APIs (Wikidata, Commons): GET requests returning JSON.

// Wikimedia's User-Agent policy asks for a way to reach the operator: the app's URL.
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";
const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 45_000];
const REQUEST_TIMEOUT_MS = 60_000;

export interface WikimediaOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<unknown>;
  retryDelaysMs?: readonly number[];
  log?: (message: string) => void;
}

// API errors (e.g. maxlag) come with HTTP 200.
const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), info: z.string().optional() }).optional(),
});

/** Throws if the body is a Wikimedia API error. */
export function assertNoApiError(body: unknown): void {
  const { error } = apiErrorSchema.parse(body);
  if (error) throw new Error(`Wikimedia API error: ${error.code} ${error.info ?? ""}`.trim());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One request: the parsed body, or a failure worth retrying. A 4xx means a bad request: throws. */
async function attempt<T>(
  url: string,
  parse: (body: unknown) => T,
  doFetch: typeof fetch,
): Promise<{ value: T } | { failure: string }> {
  let response: Response;
  try {
    response = await doFetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { failure: `network error: ${errorMessage(error)}` };
  }
  if (response.status === 429 || response.status >= 500) {
    return { failure: `HTTP ${response.status}` };
  }
  if (!response.ok) throw new Error(`Wikimedia rejected the request (HTTP ${response.status})`);
  try {
    const body: unknown = await response.json();
    assertNoApiError(body);
    return { value: parse(body) };
  } catch (error) {
    return { failure: `invalid response: ${errorMessage(error)}` };
  }
}

/** GETs a Wikimedia API URL, retrying network errors, 429, 5xx and invalid responses. */
export async function getWikimediaJson<T>(
  url: string,
  parse: (body: unknown) => T,
  options: WikimediaOptions = {},
): Promise<T> {
  const doFetch = options.fetch ?? fetch;
  const wait = options.sleep ?? sleep;
  const log = options.log ?? console.log;
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;

  for (let retry = 0; ; retry++) {
    const result = await attempt(url, parse, doFetch);
    if ("value" in result) return result.value;
    const delay = delays[retry];
    if (delay === undefined) throw new Error(`Wikimedia request failed: ${result.failure}`);
    log(`Wikimedia: ${result.failure}; retrying in ${delay / 1000}s`);
    await wait(delay);
  }
}
