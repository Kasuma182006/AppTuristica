"use client";

import { createContext, useContext, useEffect, useRef } from "react";

/** A filter's URL value ("" when it does not filter); `changed` is false on mount and unmount. */
type ReportValue = (filter: string, value: string, changed: boolean) => void;

interface FilterPanelState {
  report: ReportValue;
  /** After "Limpiar filtros" the filters start empty instead of from the address. */
  cleared: boolean;
}

export const FilterPanelContext = createContext<FilterPanelState>({
  report: () => {},
  cleared: false,
});

/**
 * The value a filter starts with: its parameter in the address (HU-51), so opening a shared
 * search restores it, or nothing after "Limpiar filtros".
 */
export function useInitialValue(fromAddress: string | undefined): string {
  const { cleared } = useContext(FilterPanelContext);
  return cleared ? "" : (fromAddress ?? "");
}

/** Lets the panel know a filter's URL value, e.g. "cascada,rio" for Tipo or "" for none. */
export function useFilterValue(filter: string, value: string): void {
  const { report } = useContext(FilterPanelContext);
  const mounted = useRef(false);
  useEffect(() => {
    report(filter, value, mounted.current);
    mounted.current = true;
  }, [report, filter, value]);
  useEffect(() => () => report(filter, "", false), [report, filter]);
}

/** Records a filter's value, returning the same object when nothing changes. */
export function withValue(
  current: Readonly<Record<string, string>>,
  filter: string,
  value: string,
): Readonly<Record<string, string>> {
  return (current[filter] ?? "") === value ? current : { ...current, [filter]: value };
}

/** How many filters are narrowing the search. */
export function activeCount(values: Readonly<Record<string, string>>): number {
  return Object.values(values).filter(Boolean).length;
}
