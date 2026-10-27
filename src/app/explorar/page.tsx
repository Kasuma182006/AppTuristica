import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterFields, FilterFieldsSkeleton } from "@/components/filter-fields";
import { EmptyResults } from "@/components/empty-results";
import { FilterPanel } from "@/components/filter-panel";
import { LoadError } from "@/components/load-error";
import { pageHref, viewOf, type View } from "@/components/filter-url";
import { PaginationBar } from "@/components/pagination-bar";
import { PlaceCard } from "@/components/place-card";
import { PlacesMap } from "@/components/places-map";
import { ResultsSkeleton } from "@/components/results-skeleton";
import { ResultsLink, ResultsRegion, ResultsTransition } from "@/components/results-transition";
import { SortSelect } from "@/components/sort-select";
import { ViewToggle } from "@/components/view-toggle";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { toUrlSearchParams, type PageSearchParams } from "@/lib/search-params";
import { parsePlaceQuery } from "@/modules/places/filters";
import { searchPlacePoints, searchPlaces } from "@/modules/places/service";
import type { PlaceSort } from "@/modules/places/types";

export const metadata: Metadata = {
  title: "Explorar",
  robots: { index: false, follow: false },
};

const numberFormat = new Intl.NumberFormat("es-CO");

const invalidAddress = (
  <p role="alert" className="text-muted">
    Algún filtro de la dirección no es válido. Elige los filtros de nuevo.
  </p>
);

/** The count, the view switch (HU-57) and, in the list, the order (HU-53). */
function ResultsHeader({ total, view, sort }: { total: number; view: View; sort?: PlaceSort }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {/* Announces the new count after each filter change. */}
      <p aria-live="polite" className="text-lg">
        {total === 1 ? "1 sitio encontrado" : `${numberFormat.format(total)} sitios encontrados`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {total > 0 && sort ? <SortSelect sort={sort} /> : null}
        <ViewToggle view={view} />
      </div>
    </div>
  );
}

/**
 * The matching sites: one page of cards (HU-52, HU-54) or all of them on the map (HU-57),
 * with suggestions when there are none (HU-55).
 */
async function Results({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const params = toUrlSearchParams(await searchParams);
  const query = parsePlaceQuery(params);
  if (!query.ok) return invalidAddress;
  const { filters, sort } = query.value;

  if (viewOf(params) === "mapa") {
    const points = await withDeadline(searchPlacePoints(filters), PAGE_DATA_DEADLINE_MS, "el mapa");
    if (!points.ok) return invalidAddress;
    return (
      <>
        <ResultsHeader total={points.value.length} view="mapa" />
        {points.value.length === 0 ? (
          <EmptyResults filters={filters} params={params} />
        ) : (
          <PlacesMap points={points.value} />
        )}
      </>
    );
  }

  const result = await withDeadline(
    searchPlaces(query.value),
    PAGE_DATA_DEADLINE_MS,
    "los resultados",
  );
  if (!result.ok) return invalidAddress;

  const { total, items, page, totalPages } = result.value;
  return (
    <>
      <ResultsHeader total={total} view="lista" sort={sort} />
      {total === 0 ? <EmptyResults filters={filters} params={params} /> : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((place) => (
          <li key={place.slug}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
      {items.length === 0 && total > 0 ? (
        <p className="text-muted">
          La página {page} no existe.{" "}
          <ResultsLink href={pageHref(params, totalPages)} className="text-primary underline">
            Ir a la última página
          </ResultsLink>
        </p>
      ) : null}
      <PaginationBar page={page} totalPages={totalPages} params={params} />
    </>
  );
}

/**
 * HU-51: the panel restores the filters in the address and keeps it updated on each change.
 * HU-56: a skeleton on the first load, dimmed results while they update, and a retry when the
 * results or the filters fail to load, each on its own.
 */
export default function ExplorePage({ searchParams }: PageProps<"/explorar">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explorar</h1>
      <ResultsTransition>
        <div className="space-y-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
          <FilterPanel live>
            <LoadError what="los filtros">
              <Suspense fallback={<FilterFieldsSkeleton />}>
                <FilterFields searchParams={searchParams} />
              </Suspense>
            </LoadError>
          </FilterPanel>
          <section aria-labelledby="resultados">
            <h2 id="resultados" className="sr-only">
              Resultados
            </h2>
            <ResultsRegion>
              <LoadError what="los resultados">
                <Suspense fallback={<ResultsSkeleton />}>
                  <Results searchParams={searchParams} />
                </Suspense>
              </LoadError>
            </ResultsRegion>
          </section>
        </div>
      </ResultsTransition>
    </div>
  );
}
