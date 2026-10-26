import { connection } from "next/server";
import { getMunicipalityOptions } from "@/modules/places/service";
import { MunicipalityFilter } from "./municipality-filter";

/** Lugar filter with the municipalities and their site counts, read at request time. */
export async function MunicipalityField() {
  await connection();
  return <MunicipalityFilter options={await getMunicipalityOptions()} />;
}

/** Placeholder with the same size while the municipalities load. */
export function MunicipalityFieldSkeleton() {
  return (
    <div className="space-y-1" aria-hidden="true">
      <p className="font-medium">Lugar</p>
      <div className="h-11 w-full animate-pulse rounded-md border border-border bg-bg" />
    </div>
  );
}
