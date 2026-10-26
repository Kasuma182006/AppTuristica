import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  PAGE_SIZE,
  SORT_SLUGS,
  type DifficultySlug,
  type OriginSlug,
  type PlaceFilters,
  type PlaceQuery,
} from "./types";

/** Query parameters of the site filters, shared by the web (/explorar) and the API. */
export const FILTER_PARAMS = [
  "lugar",
  "tipo",
  "actividad",
  "dificultad",
  "origen",
  "acceso",
] as const;

/** Query parameters of order and page (HU-37). */
export const PAGING_PARAMS = ["orden", "pagina", "por-pagina"] as const;

type FilterParam = (typeof FILTER_PARAMS)[number];
type PagingParam = (typeof PAGING_PARAMS)[number];
type QueryParam = FilterParam | PagingParam;

/** The value `acceso` takes to hide sites with restricted access. */
export const FREE_ACCESS = "libre";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const invalidValue = (param: QueryParam) => (issue: { input?: unknown }) =>
  `${param}: "${String(issue.input)}" no es un valor válido.`;

/** Comma-separated values without repeats, e.g. "cascada,rio". */
function commaList<T extends z.ZodType<string, string>>(item: T) {
  return z
    .string()
    .transform((value) => [...new Set(value.split(",").map((part) => part.trim()))])
    .pipe(z.array(item));
}

const slug = (param: FilterParam) => z.string().regex(SLUG_PATTERN, { error: invalidValue(param) });

function oneOf<K extends string>(param: QueryParam, allowed: Record<K, unknown> | readonly K[]) {
  const keys = (Array.isArray(allowed) ? allowed : Object.keys(allowed)) as [K, ...K[]];
  return z.enum(keys, {
    error: (issue) => `${param}: "${String(issue.input)}" no es válido; usa ${keys.join(", ")}.`,
  });
}

function wholeNumber(param: PagingParam, max: number) {
  return z
    .string()
    .regex(/^[0-9]+$/, { error: invalidValue(param) })
    .transform(Number)
    .pipe(
      z
        .number()
        .min(1, { error: `${param}: debe ser 1 o más.` })
        .max(max, { error: `${param}: el máximo es ${max}.` }),
    );
}

const filterParamsSchema = z.object({
  lugar: z
    .string()
    .refine((value) => !value.includes(","), { error: "lugar: admite un solo municipio." })
    .pipe(slug("lugar"))
    .optional(),
  tipo: commaList(slug("tipo")).optional(),
  actividad: commaList(slug("actividad")).optional(),
  dificultad: commaList(oneOf<DifficultySlug>("dificultad", DIFFICULTY_SLUGS)).optional(),
  origen: commaList(oneOf<OriginSlug>("origen", ORIGIN_SLUGS)).optional(),
  acceso: z
    .literal(FREE_ACCESS, { error: `acceso: el único valor es "${FREE_ACCESS}".` })
    .optional(),
});

const pagingParamsSchema = z.object({
  orden: oneOf("orden", SORT_SLUGS).optional(),
  pagina: wholeNumber("pagina", Number.MAX_SAFE_INTEGER).optional(),
  "por-pagina": wholeNumber("por-pagina", PAGE_SIZE.max).optional(),
});

/** Each parameter once, trimmed; empty ones count as absent. */
function readParams<P extends QueryParam>(
  params: URLSearchParams,
  names: readonly P[],
): ParseResult<Partial<Record<P, string>>> {
  const repeated = names.find((name) => params.getAll(name).length > 1);
  if (repeated) {
    const hint = (FILTER_PARAMS as readonly string[]).includes(repeated)
      ? "; separa los valores con comas"
      : "";
    return { ok: false, message: `${repeated}: aparece más de una vez${hint}.` };
  }
  return {
    ok: true,
    value: Object.fromEntries(
      names.map((name) => [name, params.get(name)?.trim() || undefined]),
    ) as Partial<Record<P, string>>,
  };
}

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Parámetros inválidos.";

/**
 * Reads the filters from a query string (HU-36). Empty parameters are ignored and unknown
 * ones too (e.g. `orden`); a filter repeated instead of comma-separated is an error.
 */
export function parsePlaceFilters(params: URLSearchParams): ParseResult<PlaceFilters> {
  const input = readParams(params, FILTER_PARAMS);
  if (!input.ok) return input;

  const parsed = filterParamsSchema.safeParse(input.value);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const { lugar, tipo, actividad, dificultad, origen, acceso } = parsed.data;
  return {
    ok: true,
    value: {
      municipality: lugar,
      placeTypes: tipo,
      activities: actividad,
      difficulties: dificultad?.map((value) => DIFFICULTY_SLUGS[value]),
      origins: origen?.map((value) => ORIGIN_SLUGS[value]),
      freeAccessOnly: acceso === FREE_ACCESS,
    },
  };
}

/**
 * Reads the filters, order and page (HU-37), e.g. ?tipo=cascada&orden=recientes&pagina=2.
 * Defaults: highest confidence first, page 1, 24 sites per page.
 */
export function parsePlaceQuery(params: URLSearchParams): ParseResult<PlaceQuery> {
  const filters = parsePlaceFilters(params);
  if (!filters.ok) return filters;

  const input = readParams(params, PAGING_PARAMS);
  if (!input.ok) return input;

  const parsed = pagingParamsSchema.safeParse(input.value);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  return {
    ok: true,
    value: {
      filters: filters.value,
      sort: parsed.data.orden ?? SORT_SLUGS[0],
      page: parsed.data.pagina ?? 1,
      pageSize: parsed.data["por-pagina"] ?? PAGE_SIZE.default,
    },
  };
}

/** Message for the first filter slug missing from the catalogs, if any (e.g. ?tipo=volcan). */
export function findUnknownSlug(filters: PlaceFilters, catalogs: Catalogs): string | undefined {
  const checks: [FilterParam, string[] | undefined, Catalogs[keyof Catalogs]][] = [
    ["lugar", filters.municipality ? [filters.municipality] : undefined, catalogs.municipalities],
    ["tipo", filters.placeTypes, catalogs.placeTypes],
    ["actividad", filters.activities, catalogs.activities],
  ];

  for (const [param, values, items] of checks) {
    const unknown = values?.find((value) => !items.some((item) => item.slug === value));
    if (unknown) return `${param}: "${unknown}" no existe; consulta /api/v1/catalogs.`;
  }
  return undefined;
}
