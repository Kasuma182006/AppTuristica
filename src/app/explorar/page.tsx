import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterFields, FilterFieldsSkeleton } from "@/components/filter-fields";
import { FilterPanel } from "@/components/filter-panel";
import { toUrlSearchParams, type PageSearchParams } from "@/lib/search-params";
import { parsePlaceQuery } from "@/modules/places/filters";
import { searchPlaces } from "@/modules/places/service";

// Provisional until the result cards (HU-52): only the number of matching sites.
export const metadata: Metadata = {
  title: "Explorar",
  robots: { index: false, follow: false },
};

const numberFormat = new Intl.NumberFormat("es-CO");

async function ResultCount({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const query = parsePlaceQuery(toUrlSearchParams(await searchParams));
  const result = query.ok ? await searchPlaces(query.value) : query;
  if (!result.ok) {
    return (
      <p role="alert" className="text-muted">
        Algún filtro de la dirección no es válido. Elige los filtros de nuevo.
      </p>
    );
  }

  const { total } = result.value;
  return (
    <p className="text-lg">
      {total === 1 ? "1 sitio encontrado" : `${numberFormat.format(total)} sitios encontrados`}
    </p>
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
        <section aria-label="Resultados" className="space-y-3">
          {/* Announces the new count after each filter change. */}
          <div aria-live="polite">
            <Suspense fallback={<p className="text-muted">Buscando sitios…</p>}>
              <ResultCount searchParams={searchParams} />
            </Suspense>
          </div>
          <p className="text-sm text-muted">Los resultados en tarjetas llegan pronto.</p>
        </section>
      </div>
    </div>
  );
}
