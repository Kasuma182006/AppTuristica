import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterFields, FilterFieldsSkeleton } from "@/components/filter-fields";
import { FilterPanel } from "@/components/filter-panel";
import { pageHref } from "@/components/filter-url";
import { PaginationBar } from "@/components/pagination-bar";
import { PlaceCard } from "@/components/place-card";
import { SortSelect } from "@/components/sort-select";
import { toUrlSearchParams, type PageSearchParams } from "@/lib/search-params";
import { parsePlaceQuery } from "@/modules/places/filters";
import { searchPlaces } from "@/modules/places/service";

export const metadata: Metadata = {
  title: "Explorar",
  robots: { index: false, follow: false },
};

const numberFormat = new Intl.NumberFormat("es-CO");

/** One page of the matching sites as cards (HU-52), with the numbered pages (HU-54). */
async function Results({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const params = toUrlSearchParams(await searchParams);
  const query = parsePlaceQuery(params);
  const result = query.ok ? await searchPlaces(query.value) : query;
  if (!query.ok || !result.ok) {
    return (
      <p role="alert" className="text-muted">
        Algún filtro de la dirección no es válido. Elige los filtros de nuevo.
      </p>
    );
  }

  const { total, items, page, totalPages } = result.value;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Announces the new count after each filter change. */}
        <p aria-live="polite" className="text-lg">
          {total === 1 ? "1 sitio encontrado" : `${numberFormat.format(total)} sitios encontrados`}
        </p>
        <SortSelect sort={query.value.sort} />
      </div>
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
          <Link href={pageHref(params, totalPages)} className="text-primary underline">
            Ir a la última página
          </Link>
        </p>
      ) : null}
      <PaginationBar page={page} totalPages={totalPages} params={params} />
    </>
  );
}

/** HU-51: the panel restores the filters in the address and keeps it updated on each change. */
export default function ExplorePage({ searchParams }: PageProps<"/explorar">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explorar</h1>
      <div className="space-y-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
        <FilterPanel live>
          <Suspense fallback={<FilterFieldsSkeleton />}>
            <FilterFields searchParams={searchParams} />
          </Suspense>
        </FilterPanel>
        <section aria-labelledby="resultados" className="space-y-3">
          <h2 id="resultados" className="sr-only">
            Resultados
          </h2>
          <Suspense fallback={<p className="text-muted">Buscando sitios…</p>}>
            <Results searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
