import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { MunicipalityField, MunicipalityFieldSkeleton } from "@/components/municipality-field";

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
        <Suspense fallback={<MunicipalityFieldSkeleton />}>
          <MunicipalityField />
        </Suspense>
      </FilterPanel>
    </div>
  );
}
