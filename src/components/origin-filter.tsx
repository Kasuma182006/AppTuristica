"use client";

import { useState } from "react";
import type { FilterOption } from "@/modules/places/types";
import { canUncheck, checkedParam, toggleValue } from "./chip-filter";

/** URL parameter of the Origen filter. */
const PARAM = "origen";

/**
 * Origen filter (HU-48): one checkbox per origin, all checked by default (no filter). At least
 * one stays checked; unchecking one sends only the others, e.g. ?origen=comunidad.
 */
export function OriginFilter({ options }: { options: FilterOption[] }) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(options.map((option) => option.slug)),
  );
  const [blocked, setBlocked] = useState(false);
  const value = checkedParam(options, checked);

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
