"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { anyActive, FilterActivityContext, withActive } from "./filter-panel-state";

/**
 * Search panel (RF-01, RF-02): a GET form to /explorar. Each filter (HU-44 to HU-49) is a field
 * inside it, named like its URL parameter, and reports whether it is active, so "Limpiar
 * filtros" (HU-50) only shows when there is something to clear.
 */
export function FilterPanel({ children }: { children?: ReactNode }) {
  const [active, setActive] = useState<Readonly<Record<string, boolean>>>({});
  // Changing the key remounts every filter with its initial state.
  const [resetCount, setResetCount] = useState(0);
  const submitRef = useRef<HTMLButtonElement>(null);

  const report = useCallback(
    (filter: string, isActive: boolean) =>
      setActive((current) => withActive(current, filter, isActive)),
    [],
  );

  return (
    <form
      action="/explorar"
      method="get"
      role="search"
      aria-label="Buscar lugares"
      className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <FilterActivityContext value={report}>
        <div key={resetCount} className="space-y-4">
          {children}
        </div>
      </FilterActivityContext>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {anyActive(active) ? (
          <button
            type="button"
            onClick={() => {
              setResetCount((count) => count + 1);
              // This button disappears: keep the keyboard focus in the form.
              submitRef.current?.focus();
            }}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-6 font-medium text-fg hover:border-primary sm:w-auto"
          >
            Limpiar filtros
          </button>
        ) : null}
        <button
          ref={submitRef}
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary sm:w-auto"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
