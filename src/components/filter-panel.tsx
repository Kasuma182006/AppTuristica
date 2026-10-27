"use client";

import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { activeCount, FilterPanelContext, withValue } from "./filter-panel-state";
import { exploreHref, filterKey, filterKeyOf } from "./filter-url";
import { useResultsNavigate } from "./results-transition";

type Values = Readonly<Record<string, string>>;

interface Props {
  children?: ReactNode;
  /**
   * On /explorar (HU-51): every change updates the address and the results at once, without
   * "Buscar"; on mobile the panel folds under a "Filtros" button.
   */
  live?: boolean;
}

const secondaryButton =
  "inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-6 font-medium text-fg hover:border-primary";

/** Whether an element is laid out on screen (not inside display: none). */
const isShown = (element: HTMLElement | null) => (element?.getClientRects().length ?? 0) > 0;

/**
 * Search panel (RF-01, RF-02): a form whose filters (HU-44 to HU-49) report their URL value.
 * "Limpiar filtros" (HU-50) only shows when some filter narrows the search, and the address
 * always holds the chosen filters with readable commas (HU-51).
 */
export function FilterPanel({ children, live = false }: Props) {
  const navigate = useResultsNavigate();
  const panelId = useId();
  const [values, setValues] = useState<Values>({});
  // Read by the callbacks, which must not change on every report.
  const valuesRef = useRef<Values>({});
  // Changing the key remounts every filter: empty after "Limpiar filtros", else from the address.
  const [mount, setMount] = useState({ key: 0, cleared: false });
  // The last address the panel matched, so a mismatch it cannot fix only remounts once.
  const syncedRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const count = activeCount(values);

  const showResults = useCallback(
    (next: Values) => {
      const href = exploreHref(next, new URLSearchParams(window.location.search));
      // Replacing keeps Back for leaving the search, not for undoing each chip.
      if (href !== window.location.pathname + window.location.search) {
        navigate(href, { replace: true, scroll: false });
      }
    },
    [navigate],
  );

  const report = useCallback(
    (filter: string, value: string, changed: boolean) => {
      const next = withValue(valuesRef.current, filter, value);
      if (next === valuesRef.current) return;
      valuesRef.current = next;
      setValues(next);
      if (live && changed) showResults(next);
    },
    [live, showResults],
  );

  const syncAddress = useCallback((addressFilters: string) => {
    // A render for an older address can still arrive; only the one shown counts.
    const shown = filterKeyOf(new URLSearchParams(window.location.search));
    if (addressFilters !== shown || addressFilters === syncedRef.current) return;
    syncedRef.current = addressFilters;
    if (addressFilters !== filterKey(valuesRef.current)) {
      setMount((current) => ({ key: current.key + 1, cleared: false }));
    }
  }, []);

  const state = useMemo(
    () => ({ report, cleared: mount.cleared, syncAddress }),
    [report, mount.cleared, syncAddress],
  );

  function clear() {
    setMount((current) => ({ key: current.key + 1, cleared: true }));
    if (live) showResults({});
    // This button disappears: keep the keyboard focus in the panel.
    const target = live ? [toggleRef.current, headingRef.current].find(isShown) : submitRef.current;
    target?.focus();
  }

  const clearButton =
    count > 0 ? (
      <button
        type="button"
        onClick={clear}
        className={live ? secondaryButton : `${secondaryButton} sm:w-auto`}
      >
        Limpiar filtros
      </button>
    ) : null;

  const fields = (
    <FilterPanelContext value={state}>
      <div key={mount.key} className="space-y-4">
        {children}
      </div>
    </FilterPanelContext>
  );

  if (!live) {
    return (
      <form
        action="/explorar"
        method="get"
        role="search"
        aria-label="Buscar lugares"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(exploreHref(valuesRef.current, new URLSearchParams()));
        }}
        className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6"
      >
        {fields}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {clearButton}
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

  return (
    <form
      role="search"
      aria-label="Filtros"
      onSubmit={(event) => event.preventDefault()}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between font-medium lg:hidden"
      >
        <span>
          Filtros
          {count > 0 ? (
            <span className="text-muted"> ({count === 1 ? "1 activo" : `${count} activos`})</span>
          ) : null}
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      <div id={panelId} className={`space-y-4 ${open ? "mt-4" : "hidden"} lg:mt-0 lg:block`}>
        <h2 ref={headingRef} tabIndex={-1} className="hidden font-semibold lg:block">
          Filtros
        </h2>
        {fields}
        <div className="flex flex-col gap-3">
          {clearButton}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              toggleRef.current?.focus();
            }}
            className={`${secondaryButton} lg:hidden`}
          >
            Ver resultados
          </button>
        </div>
      </div>
    </form>
  );
}
