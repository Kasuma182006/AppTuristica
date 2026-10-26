"use client";

import { useState } from "react";
import type { FilterOption } from "@/modules/places/types";
import { joinSelected, toggleValue } from "./chip-filter";

interface Props {
  /** Visible name of the filter, e.g. "Tipo". */
  legend: string;
  /** URL parameter, e.g. "tipo". */
  param: string;
  options: FilterOption[];
}

/**
 * Multiple-choice filter as toggle chips (HU-45, HU-46): OR within the filter (RF-03). Sends
 * the chosen slugs comma-separated in one parameter, e.g. ?tipo=cascada,rio.
 */
export function ChipGroupFilter({ legend, param, options }: Props) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const value = joinSelected(options, selected);

  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{legend}</legend>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = selected.has(option.slug);
          return (
            <li key={option.slug}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelected((current) => toggleValue(current, option.slug))}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${
                  pressed
                    ? "border-primary bg-primary text-on-primary"
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
