import Link from "next/link";
import { getCatalogs } from "@/modules/catalogs/service";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  activeFilters,
  FILTER_PARAMS,
  FREE_ACCESS,
  type FilterParam,
} from "@/modules/places/filters";
import { countWithoutEachFilter } from "@/modules/places/service";
import {
  DIFFICULTY_LABELS,
  ORIGIN_LABELS,
  type DifficultySlug,
  type OriginSlug,
  type PlaceFilters,
} from "@/modules/places/types";
import { exploreHref, splitList } from "./filter-url";
import { placeCountLabel } from "./municipality-search";

const FILTER_LABELS: Record<FilterParam, string> = {
  lugar: "Lugar",
  tipo: "Tipo",
  actividad: "Actividad",
  dificultad: "Dificultad",
  origen: "Origen",
  acceso: "Acceso",
};

/** How a filter reads in the suggestion, e.g. "Tipo: Cascada, Río". */
function filterText(param: FilterParam, value: string, catalogs: Catalogs): string {
  if (param === "acceso" && value === FREE_ACCESS) return "Ocultar acceso restringido";
  const lists: Partial<Record<FilterParam, readonly { slug: string; name: string }[]>> = {
    lugar: catalogs.municipalities,
    tipo: catalogs.placeTypes,
    actividad: catalogs.activities,
  };
  const name = (slug: string) =>
    lists[param]?.find((item) => item.slug === slug)?.name ??
    (param === "dificultad" ? DIFFICULTY_LABELS[slug as DifficultySlug] : undefined) ??
    (param === "origen" ? ORIGIN_LABELS[slug as OriginSlug] : undefined) ??
    slug;
  return `${FILTER_LABELS[param]}: ${splitList(value).map(name).join(", ")}`;
}

interface Props {
  filters: PlaceFilters;
  /** The current address, to build the links without one filter. */
  params: URLSearchParams;
}

const linkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg px-4 text-sm hover:border-primary";

/**
 * A search without results (HU-55, RF-08): suggests which filter to remove, with the sites it
 * would bring back, and a button to clear them all. Links replace the address like the panel.
 */
export async function EmptyResults({ filters, params }: Props) {
  if (activeFilters(filters).length === 0) {
    return <p className="text-muted">Todavía no hay sitios publicados.</p>;
  }

  const [suggestions, catalogs] = await Promise.all([
    countWithoutEachFilter(filters),
    getCatalogs(),
  ]);
  const current = (param: FilterParam) => params.get(param)?.trim() ?? "";
  const valuesWithout = (removed?: FilterParam) =>
    Object.fromEntries(
      FILTER_PARAMS.map((param) => [param, param === removed ? "" : current(param)]),
    );

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="space-y-1">
        <p className="font-semibold">No hay sitios con estos filtros.</p>
        <p className="text-muted">
          {suggestions.length > 0
            ? "Prueba quitando uno:"
            : "Quitar un solo filtro no basta. Prueba limpiarlos todos."}
        </p>
      </div>
      {suggestions.length > 0 ? (
        <ul className="space-y-2">
          {suggestions.map(({ param, total }) => (
            <li key={param} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={exploreHref(valuesWithout(param), params)}
                replace
                scroll={false}
                prefetch={false}
                className={linkClass}
              >
                <span aria-hidden="true">×</span>
                <span>
                  <span className="sr-only">Quitar </span>
                  {filterText(param, current(param), catalogs)}
                </span>
              </Link>
              <span className="text-sm text-muted">{placeCountLabel(total)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={exploreHref({}, params)}
        replace
        scroll={false}
        prefetch={false}
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary"
      >
        Limpiar filtros
      </Link>
    </div>
  );
}
