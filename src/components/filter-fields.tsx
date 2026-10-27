import { connection } from "next/server";
import type { PageSearchParams } from "@/lib/search-params";
import { getFilterOptions } from "@/modules/places/service";
import { AccessFilter } from "./access-filter";
import { ChipGroupFilter } from "./chip-group-filter";
import { MunicipalityFilter } from "./municipality-filter";
import { OriginFilter } from "./origin-filter";

/**
 * The panel's filters with their values and site counts, read at request time. With the page's
 * `searchParams`, each filter starts with its value in the address (HU-51).
 */
export async function FilterFields({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  await connection();
  const [options, params] = await Promise.all([getFilterOptions(), searchParams]);
  // A repeated parameter is not valid (HU-36): its first value is enough to start with.
  const initial = (param: string) => [params?.[param] ?? []].flat()[0]?.trim();
  return (
    <>
      <MunicipalityFilter options={options.municipalities} initial={initial("lugar")} />
      <ChipGroupFilter
        legend="Tipo"
        param="tipo"
        options={options.placeTypes}
        initial={initial("tipo")}
      />
      <ChipGroupFilter
        legend="Actividad"
        param="actividad"
        options={options.activities}
        initial={initial("actividad")}
      />
      <ChipGroupFilter
        legend="Dificultad"
        param="dificultad"
        options={options.difficulties}
        initial={initial("dificultad")}
      />
      <OriginFilter options={options.origins} initial={initial("origen")} />
      <AccessFilter restrictedCount={options.restrictedCount} initial={initial("acceso")} />
    </>
  );
}

/** Placeholders with roughly the same size while the filters load. */
export function FilterFieldsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="space-y-1">
        <p className="font-medium">Lugar</p>
        <div className="h-11 w-full animate-pulse rounded-md border border-border bg-bg" />
      </div>
      {["Tipo", "Actividad", "Dificultad", "Origen", "Acceso"].map((legend) => (
        <div key={legend} className="space-y-2">
          <p className="font-medium">{legend}</p>
          <div className="h-24 w-full animate-pulse rounded-md bg-bg" />
        </div>
      ))}
    </div>
  );
}
