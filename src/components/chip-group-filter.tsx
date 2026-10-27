"use client";

import { useState } from "react";
import type { FilterOption } from "@/modules/places/types";
import { joinSelected, toggleValue } from "./chip-filter";
import { useFilterValue, useInitialValue } from "./filter-panel-state";
import { splitList } from "./filter-url";

interface Props {
  /** Visible name of the filter, e.g. "Tipo". */
  legend: string;
  /** URL parameter, e.g. "tipo". */
  param: string;
  options: FilterOption[];
  /** The parameter's value in the address, e.g. "cascada,rio". */
  initial?: string;
}

/**
 * Multiple-choice filter as toggle chips (HU-45, HU-46): OR within the filter (RF-03). Sends
 * the chosen slugs comma-separated in one parameter, e.g. ?tipo=cascada,rio. Values without
 * sites are shown but cannot be chosen. Starts with the values in the address (HU-51).
 */
export function ChipGroupFilter({ legend, param, options, initial: fromAddress }: Props) {
  const initial = useInitialValue(fromAddress);
  // Unknown slugs in the address are left out.
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(splitList(initial).filter((slug) => options.some((o) => o.slug === slug))),
  );
  const value = joinSelected(options, selected);
  useFilterValue(param, value);

  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{legend}</legend>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = selected.has(option.slug);
          // Without sites it would only lead to an empty search; still focusable and announced.
          const empty = option.placeCount === 0;
          return (
            <li key={option.slug}>
              <button
                type="button"
                aria-pressed={pressed}
                aria-disabled={empty || undefined}
                onClick={() => {
                  // A value without sites can still be removed if the address chose it.
                  if (!empty || pressed)
                    setSelected((current) => toggleValue(current, option.slug));
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${
                  pressed
                    ? "border-primary bg-primary text-on-primary"
                    : empty
                      ? "cursor-not-allowed border-dashed border-border bg-transparent text-muted"
                      : "border-border bg-bg text-fg hover:border-primary"
                }`}
              >
                {pressed ? <span aria-hidden="true">✓</span> : null}
                <span>{option.name}</span>
                <span className={pressed ? "text-on-primary" : "text-muted"}>
                  <span className="sr-only">, </span>
                  {option.placeCount}
                  <span className="sr-only"> sitios</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {value ? <input type="hidden" name={param} value={value} /> : null}
    </fieldset>
  );
}
