import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError } from "@/components/load-error";
import { ProposalForm } from "@/components/proposal-form";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { getCatalogs } from "@/modules/catalogs/service";

// Not indexed while it cannot receive proposals (until HU-83).
export const metadata: Metadata = {
  title: "Proponer lugar",
  robots: { index: false, follow: false },
};

/** The form with the types, activities and municipalities, read at request time. */
async function ProposalFormWithCatalogs() {
  await connection();
  const { placeTypes, activities, municipalities } = await withDeadline(
    getCatalogs(),
    PAGE_DATA_DEADLINE_MS,
    "el formulario",
  );
  return (
    <ProposalForm placeTypes={placeTypes} activities={activities} municipalities={municipalities} />
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
        <div className="h-32 animate-pulse rounded-md bg-surface" />
      </div>
    </>
  );
}

/** Where to propose a site (HU-74, RF-19). */
export default function ProposePlacePage() {
  return (
    <div className="space-y-6">
      <header className="max-w-xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proponer lugar</h1>
        <p className="text-muted">
          Comparte un sitio poco conocido del Valle del Cauca para que otros lo descubran.
        </p>
      </header>

      {/* Until HU-83: nobody should fill in the form believing it will be published. */}
      <p className="max-w-xl rounded-xl border border-border bg-surface p-4 font-medium">
        Todavía no recibimos propuestas. Puedes ver el formulario, pero lo que escribas no se
        guardará.
      </p>

      <LoadError what="el formulario">
        <Suspense fallback={<ProposalFormSkeleton />}>
          <ProposalFormWithCatalogs />
        </Suspense>
      </LoadError>
    </div>
  );
}
