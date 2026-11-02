"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { placePath } from "@/lib/routes";
import type { PublishedPlace } from "@/modules/proposals/types";

/** What a visitor sees once their site is published (HU-83, RF-21). */
export function ProposalConfirmation({
  place,
  onProposeAnother,
}: {
  place: PublishedPlace;
  onProposeAnother: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form that had the focus is gone.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="propuesta-publicada"
      className="max-w-xl space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <h2 id="propuesta-publicada" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        ¡Tu sitio ya está publicado!
      </h2>
      <p>
        <span className="font-medium">{place.name}</span> ya aparece en el buscador, marcado como
        propuesto por la comunidad y sin verificar. Gracias por compartirlo.
      </p>
      {place.fragile ? (
        <p>Como lo marcaste frágil, mostramos un área de unos 2 km y no su punto exacto.</p>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href={placePath(place.slug)}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary"
        >
          Ver la ficha
        </Link>
        <button
          type="button"
          onClick={onProposeAnother}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-6 font-medium hover:border-primary"
        >
          Proponer otro lugar
        </button>
      </div>
    </section>
  );
}
