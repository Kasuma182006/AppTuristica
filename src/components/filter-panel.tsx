import type { ReactNode } from "react";

/**
 * Search panel (RF-01, RF-02): a plain GET form to /explorar, so it works without JavaScript.
 * Each filter (HU-44 to HU-49) is a field inside it, named like its URL parameter.
 */
export function FilterPanel({ children }: { children?: ReactNode }) {
  return (
    <form
      action="/explorar"
      method="get"
      role="search"
      aria-label="Buscar lugares"
      className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      {children}
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary sm:w-auto"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
