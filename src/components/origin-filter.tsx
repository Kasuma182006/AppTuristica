"use client";

import { useState } from "react";
import type { FilterOption } from "@/modules/places/types";
import { canUncheck, checkedParam, toggleValue } from "./chip-filter";
import { useFilterValue, useInitialValue } from "./filter-panel-state";
import { splitList } from "./filter-url";

/** URL parameter of the Origen filter. */
const PARAM = "origen";

interface Props {
  options: FilterOption[];
  /** The parameter's value in the address, e.g. "comunidad". */
  initial?: string;
}

/**
 * Origen filter (HU-48): one checkbox per origin, all checked by default (no filter). At least
 * one stays checked; unchecking one sends only the others, e.g. ?origen=comunidad. Starts with
 * the address's choice (HU-51).
 */
export function OriginFilter({ options, initial: fromAddress }: Props) {
  const initial = useInitialValue(fromAddress);
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => {
    const chosen = splitList(initial).filter((slug) => options.some((o) => o.slug === slug));
    // Nothing valid in the address means no filter: every origin checked.
    return new Set(chosen.length > 0 ? chosen : options.map((option) => option.slug));
  });
  const [blocked, setBlocked] = useState(false);
  const value = checkedParam(options, checked);
  useFilterValue(PARAM, value);

  function onToggle(slug: string) {
    const allowed = canUncheck(checked, slug);
    setBlocked(!allowed);
    if (allowed) setChecked((current) => toggleValue(current, slug));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Origen</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {options.map((option) => (
          <label key={option.slug} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={checked.has(option.slug)}
              onChange={() => onToggle(option.slug)}
              className="size-5 accent-primary"
            />
            <span>{option.name}</span>
            <span className="text-muted">
              <span className="sr-only">, </span>
              {option.placeCount}
              <span className="sr-only"> sitios</span>
            </span>
          </label>
        ))}
      </div>
      <p aria-live="polite" className="text-sm text-muted">
        {blocked ? "Deja marcado al menos un origen." : ""}
      </p>
      {value ? <input type="hidden" name={PARAM} value={value} /> : null}
    </fieldset>
  );
}
