import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError } from "@/components/load-error";
import { ProposalForm } from "@/components/proposal-form";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { pageMetadata } from "@/lib/page-metadata";
import { getCatalogs, getMunicipalityBounds } from "@/modules/catalogs/service";

export const metadata: Metadata = pageMetadata({
  title: "Proponer lugar",
  description:
    "Comparte un sitio turístico poco conocido del Valle del Cauca para que otros lo descubran. Sin cuentas: se publica de inmediato.",
  path: "/proponer",
});

/** The form with the catalogs and the area of each municipality, read at request time. */
async function ProposalFormWithCatalogs() {
  await connection();
  const [{ placeTypes, activities, municipalities }, municipalityBounds] = await withDeadline(
    Promise.all([getCatalogs(), getMunicipalityBounds()]),
    PAGE_DATA_DEADLINE_MS,
    "el formulario",
  );
  return (
    <ProposalForm
      placeTypes={placeTypes}
      activities={activities}
      municipalities={municipalities}
      municipalityBounds={municipalityBounds}
    />
  );
}

/** Placeholders shaped like the form while it loads. */
function ProposalFormSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando el formulario…
      </p>
      <div aria-hidden="true" className="max-w-xl space-y-6">
        <div className="h-11 animate-pulse rounded-md bg-surface" />
        <div className="h-11 animate-pulse rounded-md bg-surface" />
        <div className="h-32 animate-pulse rounded-md bg-surface" />
        <div className="h-11 animate-pulse rounded-md bg-surface" />
        <div className="h-80 animate-pulse rounded-xl bg-surface sm:h-96" />
        <div className="h-32 animate-pulse rounded-md bg-surface" />
      </div>
    </>
  );
}

/** Where to propose a site (HU-74 to HU-83, RF-19 to RF-21). */
export default function ProposePlacePage() {
  return (
    <div className="space-y-6">
      <header className="max-w-xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proponer lugar</h1>
        <p className="text-muted">
          Comparte un sitio poco conocido del Valle del Cauca para que otros lo descubran.
        </p>
      </header>

      <LoadError what="el formulario">
        <Suspense fallback={<ProposalFormSkeleton />}>
          <ProposalFormWithCatalogs />
        </Suspense>
      </LoadError>
    </div>
  );
}
