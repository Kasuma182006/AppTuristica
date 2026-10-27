"use client";

import { createContext, useContext, useEffect } from "react";

type ReportActive = (filter: string, active: boolean) => void;

export const FilterActivityContext = createContext<ReportActive>(() => {});

/** Tells the search panel whether this filter currently restricts the search (HU-50). */
export function useReportActive(filter: string, active: boolean): void {
  const report = useContext(FilterActivityContext);
  useEffect(() => {
    report(filter, active);
    return () => report(filter, false);
  }, [report, filter, active]);
}

/** Records one filter's state, keeping the same object when nothing changes. */
export function withActive(
  current: Readonly<Record<string, boolean>>,
  filter: string,
  active: boolean,
): Readonly<Record<string, boolean>> {
  return (current[filter] ?? false) === active ? current : { ...current, [filter]: active };
}

export function anyActive(state: Readonly<Record<string, boolean>>): boolean {
  return Object.values(state).some(Boolean);
}
