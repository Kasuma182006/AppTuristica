"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { DISCLAIMER_PATH } from "@/lib/routes";
import { closeFirstVisitNotice, hideFirstVisitNoticeIfClosed } from "./first-visit";

/**
 * The notice of a first visit (HU-87, RF-24). It is part of the HTML of every page and CSS hides it
 * once closed (FIRST_VISIT_SCRIPT), so a page never moves when it goes away on load.
 */
export function FirstVisitNotice() {
  // Before painting, so it does not flash where FIRST_VISIT_SCRIPT did not run.
  useLayoutEffect(hideFirstVisitNoticeIfClosed, []);

  return (
    <aside
      aria-label="Aviso de proyecto experimental"
      // Its text should not become the snippet of every page in search results.
      data-nosnippet
      className="border-b border-border bg-surface [html[data-notice-closed]_&]:hidden"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-sm sm:flex-1">
          <strong>Proyecto experimental.</strong> La información viene de fuentes abiertas y de la
          comunidad, y puede tener errores o estar desactualizada. Confirma el acceso y el estado
          del lugar antes de ir.
        </p>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={closeFirstVisitNotice}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:border-primary"
          >
            Entendido
          </button>
          <Link
            href={DISCLAIMER_PATH}
            prefetch={false}
            className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            Aviso de responsabilidad
          </Link>
        </div>
      </div>
    </aside>
  );
}
