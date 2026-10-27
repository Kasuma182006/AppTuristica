"use client";

import { createContext, useContext, useEffect, useRef } from "react";

/** A filter's URL value ("" when it does not filter); `changed` is false on mount and unmount. */
type ReportValue = (filter: string, value: string, changed: boolean) => void;

interface FilterPanelState {
  report: ReportValue;
  /** After "Limpiar filtros" the filters start empty instead of from the address. */
  cleared: boolean;
  /** The filters of the address the page was rendered for (see AddressSync). */
  syncAddress: (filters: string) => void;
}

export const FilterPanelContext = createContext<FilterPanelState>({
  report: () => {},
  cleared: false,
  syncAddress: () => {},
});

/**
 * Tells the panel which filters the page was rendered for (HU-55), e.g. "/explorar?tipo=rio".
 * When the address changed without the panel (Back, a link of the empty state), the panel
 * starts again from it. Render it after the filters, so they have reported their values.
 */
export function AddressSync({ filters }: { filters: string }): null {
  const { syncAddress } = useContext(FilterPanelContext);
  useEffect(() => syncAddress(filters), [syncAddress, filters]);
  return null;
}

/**
 * The value a filter starts with: its parameter in the address (HU-51), so opening a shared
 * search restores it, or nothing after "Limpiar filtros".
 */
export function useInitialValue(fromAddress: string | undefined): string {
  const { cleared } = useContext(FilterPanelContext);
  return cleared ? "" : (fromAddress ?? "");
}

/**
 * Lets the panel know a filter's URL value, e.g. "cascada,rio" for Tipo or "" for none. Only a
 * new value is a change: a new `report` function must not look like an unmount and a remount,
 * which the panel would take for the visitor's change (HU-56: it sent page 2 back to page 1).
 */
export function useFilterValue(filter: string, value: string): void {
  const { report } = useContext(FilterPanelContext);
  const reportRef = useRef(report);
  const mounted = useRef(false);
  useEffect(() => {
    reportRef.current = report;
  }, [report]);
  useEffect(() => {
    reportRef.current(filter, value, mounted.current);
    mounted.current = true;
  }, [filter, value]);
  useEffect(() => () => reportRef.current(filter, "", false), [filter]);
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
