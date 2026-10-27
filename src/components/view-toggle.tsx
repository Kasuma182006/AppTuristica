"use client";

import { VIEWS, viewHref, type View } from "./filter-url";
import { useResultsNavigate } from "./results-transition";

const VIEW_LABELS: Record<View, string> = { lista: "Lista", mapa: "Mapa" };

/** List or map (HU-57): the view goes in the address and the filters stay. */
export function ViewToggle({ view }: { view: View }) {
  const navigate = useResultsNavigate();

  return (
    <div
      role="group"
      aria-label="Vista"
      className="inline-flex rounded-md border border-border p-1"
    >
      {VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === view}
          onClick={() => {
            if (option === view) return;
            // Replacing, like filters and order: Back leaves the search.
            navigate(viewHref(new URLSearchParams(window.location.search), option), {
              replace: true,
              scroll: false,
            });
          }}
          className={`inline-flex h-9 min-w-20 items-center justify-center rounded px-3 text-sm font-medium ${
            option === view ? "bg-primary text-on-primary" : "text-fg hover:bg-bg"
          }`}
        >
          {VIEW_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
