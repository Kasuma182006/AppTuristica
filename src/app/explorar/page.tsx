import type { Metadata } from "next";
import { Suspense } from "react";
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
        Algún filtro de la dirección no es válido. Vuelve al inicio para buscar de nuevo.
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

export default function ExplorePage({ searchParams }: PageProps<"/explorar">) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explorar</h1>
      <Suspense fallback={<p className="text-muted">Buscando sitios…</p>}>
        <ResultCount searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-muted">Los resultados en tarjetas llegan pronto.</p>
    </div>
  );
}
