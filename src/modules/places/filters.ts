import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  type DifficultySlug,
  type OriginSlug,
  type PlaceFilters,
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

type FilterParam = (typeof FILTER_PARAMS)[number];

/** The value `acceso` takes to hide sites with restricted access. */
export const FREE_ACCESS = "libre";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const invalidValue = (param: FilterParam) => (issue: { input?: unknown }) =>
  `${param}: "${String(issue.input)}" no es un valor válido.`;

/** Comma-separated values without repeats, e.g. "cascada,rio". */
function commaList<T extends z.ZodType<string, string>>(item: T) {
  return z
    .string()
    .transform((value) => [...new Set(value.split(",").map((part) => part.trim()))])
    .pipe(z.array(item));
}

const slug = (param: FilterParam) => z.string().regex(SLUG_PATTERN, { error: invalidValue(param) });

function oneOf<K extends string>(param: FilterParam, allowed: Record<K, unknown>) {
  const keys = Object.keys(allowed) as [K, ...K[]];
  return z.enum(keys, {
    error: (issue) => `${param}: "${String(issue.input)}" no es válido; usa ${keys.join(", ")}.`,
  });
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

/**
 * Reads the filters from a query string (HU-36). Empty parameters are ignored and unknown
 * ones too (e.g. `page`); a filter repeated instead of comma-separated is an error.
 */
export function parsePlaceFilters(params: URLSearchParams): ParseResult<PlaceFilters> {
  const repeated = FILTER_PARAMS.find((param) => params.getAll(param).length > 1);
  if (repeated) {
    return {
      ok: false,
      message: `${repeated}: aparece más de una vez; separa los valores con comas.`,
    };
  }

  const input = Object.fromEntries(
    FILTER_PARAMS.map((param) => [param, params.get(param)?.trim() || undefined]),
  );
  const parsed = filterParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Filtros inválidos." };
  }

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
