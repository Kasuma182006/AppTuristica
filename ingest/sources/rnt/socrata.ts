import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

// Registro Nacional de Turismo on datos.gov.co (Socrata API, no key needed). It lists active
// providers only, as one monthly snapshot.
const RNT_RESOURCE_URL = "https://www.datos.gov.co/resource/thwd-ivmp.json";
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";
const PAGE_SIZE = 1000;
const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 45_000];
const REQUEST_TIMEOUT_MS = 60_000;

export interface SocrataOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<unknown>;
  retryDelaysMs?: readonly number[];
  log?: (message: string) => void;
}

/** The columns read from each agency; Socrata leaves out empty ones. */
export const rntRowSchema = z.object({
  codigo_rnt: z.string().regex(/^[1-9]\d*$/),
  cod_mun: z.string().regex(/^\d{5}$/),
  razon_social_establecimiento: z.string().trim().min(1),
  sub_categoria: z.string(),
  nit: z.string().optional(),
  num_celular: z.string().optional(),
  n_m_tel_fono: z.string().optional(),
  correo_establecimiento: z.string().optional(),
});
export type RntRow = z.infer<typeof rntRowSchema>;

const COLUMNS = Object.keys(rntRowSchema.shape).join(", ");
const countSchema = z.array(z.object({ total: z.string().regex(/^\d+$/) })).length(1);

const quote = (text: string) => `'${text.replaceAll("'", "''")}'`;

/** SoQL filter: active travel agencies of the given subcategories in the given departments. */
export function buildAgenciesWhere(
  departmentCodes: readonly string[],
  subcategories: readonly string[],
): string {
  return [
    `cod_dpto in(${departmentCodes.map(Number).join(", ")})`,
    `categoria = 'AGENCIAS DE VIAJES'`,
    `sub_categoria in(${subcategories.map(quote).join(", ")})`,
    `estado_rnt = 'ACTIVO'`,
  ].join(" AND ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One request: the parsed body, or a failure worth retrying. A 4xx means a bad query: throws. */
async function attempt<T>(
  url: string,
  parse: (body: unknown) => T,
  doFetch: typeof fetch,
): Promise<{ value: T } | { failure: string }> {
  let response: Response;
  try {
    response = await doFetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { failure: `network error: ${errorMessage(error)}` };
  }
  if (response.status === 429 || response.status >= 500) {
    return { failure: `HTTP ${response.status}` };
  }
  if (!response.ok) throw new Error(`datos.gov.co rejected the query (HTTP ${response.status})`);
  try {
    return { value: parse(await response.json()) };
  } catch (error) {
    return { failure: `invalid response: ${errorMessage(error)}` };
  }
}

async function getJson<T>(
  params: Record<string, string>,
  parse: (body: unknown) => T,
  options: SocrataOptions,
): Promise<T> {
  const url = `${RNT_RESOURCE_URL}?${new URLSearchParams(params)}`;
  const doFetch = options.fetch ?? fetch;
  const wait = options.sleep ?? sleep;
  const log = options.log ?? console.log;
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;

  for (let retry = 0; ; retry++) {
    const result = await attempt(url, parse, doFetch);
    if ("value" in result) return result.value;
    const delay = delays[retry];
    if (delay === undefined) throw new Error(`datos.gov.co request failed: ${result.failure}`);
    log(`datos.gov.co: ${result.failure}; retrying in ${delay / 1000}s`);
    await wait(delay);
  }
}

function codeOf(item: unknown): string {
  return typeof item === "object" && item !== null && "codigo_rnt" in item
    ? String(item.codigo_rnt)
    : "?";
}

export interface RntDownload {
  rows: RntRow[];
  /** Codes of rows missing a required column, left out. */
  invalid: string[];
}

/**
 * Every matching agency, page by page. Fails when the pages add up to fewer rows than the API
 * counts (or none): agencies missing from the download would be wrongly made inactive.
 */
export async function fetchRntAgencies(
  where: string,
  options: SocrataOptions = {},
): Promise<RntDownload> {
  const [count] = await getJson(
    { $select: "count(*) AS total", $where: where },
    (body) => countSchema.parse(body),
    options,
  );
  const total = Number(count?.total ?? 0);
  if (total === 0) throw new Error("The RNT returned no agencies");

  const raw: unknown[] = [];
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const page = await getJson(
      {
        $select: COLUMNS,
        $where: where,
        $order: "codigo_rnt",
        $limit: String(PAGE_SIZE),
        $offset: String(offset),
      },
      (body) => z.array(z.unknown()).parse(body),
      options,
    );
    raw.push(...page);
  }
  if (raw.length !== total) {
    throw new Error(`The RNT download is incomplete: ${raw.length} of ${total} agencies`);
  }

  const download: RntDownload = { rows: [], invalid: [] };
  for (const item of raw) {
    const parsed = rntRowSchema.safeParse(item);
    if (parsed.success) download.rows.push(parsed.data);
    else download.invalid.push(codeOf(item));
  }
  return download;
}
