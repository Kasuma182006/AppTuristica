import Link from "next/link";
import { MunicipalitySuggestion } from "./municipality-suggestion";

/** What a visitor sees for a site that does not exist or is hidden (HU-69, RF-10). */
export function PlaceNotFound() {
  return (
    <div className="max-w-prose space-y-4">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Este sitio no existe o ya no está disponible
      </h1>
      <p className="text-muted">Puede que lo hayan retirado o que la dirección esté mal escrita.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/explorar"
          prefetch={false}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary"
        >
          Explorar sitios
        </Link>
        <MunicipalitySuggestion />
      </div>
    </div>
  );
}
