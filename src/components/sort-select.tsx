"use client";

import { useId } from "react";
import { SORT_SLUGS, type PlaceSort } from "@/modules/places/types";
import { sortHref } from "./filter-url";
import { useResultsNavigate } from "./results-transition";

/** Names of the orders (RF-07); "Más completos" matches the cards' "Datos …" levels. */
const SORT_LABELS: Record<PlaceSort, string> = {
  confianza: "Más completos",
  recientes: "Más recientes",
  alfabetico: "Alfabético (A-Z)",
};

const isSort = (value: string): value is PlaceSort =>
  (SORT_SLUGS as readonly string[]).includes(value);

/** Order of the results (HU-53): each change updates the address and the results at once. */
export function SortSelect({ sort }: { sort: PlaceSort }) {
  const navigate = useResultsNavigate();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">
        Ordenar por
      </label>
      <select
        id={id}
        // Uncontrolled: keeps the choice (and the keyboard focus) while the results load.
        defaultValue={sort}
        onChange={(event) => {
          const next = event.target.value;
          if (!isSort(next)) return;
          // Replacing keeps Back for leaving the search, like the filters (HU-51).
          navigate(sortHref(new URLSearchParams(window.location.search), next), {
            replace: true,
            scroll: false,
          });
        }}
        className="h-11 rounded-md border border-border bg-bg px-3 text-base text-fg"
      >
        {SORT_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {SORT_LABELS[slug]}
          </option>
        ))}
      </select>
    </div>
  );
}
