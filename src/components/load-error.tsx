"use client";

import { catchError, type ErrorInfo } from "next/error";

/**
 * What could not load, e.g. "los resultados". The error itself is not shown: in production
 * Next.js hides server error messages, and they are not for visitors anyway.
 */
function LoadErrorFallback({ what }: { what: string }, { retry }: ErrorInfo) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p className="font-semibold">No pudimos cargar {what}.</p>
      <p className="text-muted">Puede ser la conexión o un problema nuestro. Inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary"
      >
        Reintentar
      </button>
    </div>
  );
}

/**
 * Error boundary for one part of a page (HU-56): the rest keeps working, and "Reintentar"
 * fetches that part again.
 */
export const LoadError = catchError(LoadErrorFallback);
