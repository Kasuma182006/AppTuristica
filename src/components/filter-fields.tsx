import { connection } from "next/server";
import { getFilterOptions } from "@/modules/places/service";
import { ChipGroupFilter } from "./chip-group-filter";
import { MunicipalityFilter } from "./municipality-filter";

/** The panel's filters with their values and site counts, read at request time. */
export async function FilterFields() {
  await connection();
  const options = await getFilterOptions();
  return (
    <>
      <MunicipalityFilter options={options.municipalities} />
      <ChipGroupFilter legend="Tipo" param="tipo" options={options.placeTypes} />
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
      <div className="space-y-2">
        <p className="font-medium">Tipo</p>
        <div className="h-24 w-full animate-pulse rounded-md bg-bg" />
      </div>
    </div>
  );
}
