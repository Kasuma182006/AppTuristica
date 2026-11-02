import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { FilterFields, FilterFieldsSkeleton } from "@/components/filter-fields";
import { LoadError } from "@/components/load-error";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Buscador turístico del Valle del Cauca",
    description:
      "Encuentra cascadas, senderos, miradores y ríos poco conocidos de los 42 municipios del Valle del Cauca, con datos abiertos.",
    path: "/",
  }),
  // The home page goes without the " · Buscador turístico" ending.
  title: { absolute: "Buscador turístico del Valle del Cauca" },
};

/** HU-43 (RF-01): a short introduction and the filter panel, nothing else. */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:pt-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          Lugares poco conocidos del Valle del Cauca
        </h1>
        <p className="text-muted sm:text-lg">
          Cascadas, ríos, senderos y miradores de los 42 municipios, con datos abiertos.
        </p>
      </header>
      <FilterPanel>
        <LoadError what="los filtros">
          <Suspense fallback={<FilterFieldsSkeleton />}>
            <FilterFields />
          </Suspense>
        </LoadError>
      </FilterPanel>
    </div>
  );
}
