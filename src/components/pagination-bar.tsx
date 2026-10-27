import type { ReactNode } from "react";
import { pageHref } from "./filter-url";
import { pageItems, type PageItem } from "./pagination";
import { ResultsLink } from "./results-transition";

const box = "inline-flex h-11 min-w-11 items-center justify-center rounded-md px-3";

interface Props {
  page: number;
  totalPages: number;
  /** The current address, so every link keeps the filters and the order. */
  params: URLSearchParams;
}

/**
 * Numbered pagination (HU-54, RF-07): previous, numbers and next. Pages are plain links, so Back
 * returns to the previous page; small screens show only the current page between the ends.
 */
export function PaginationBar({ page, totalPages, params }: Props) {
  if (totalPages <= 1) return null;

  const link = (target: number, children: ReactNode, label: string, rel?: string) => (
    // Not prefetched: each page renders the whole search, so it is only fetched when chosen.
    <ResultsLink
      href={pageHref(params, target)}
      rel={rel}
      aria-label={label}
      aria-current={target === page && !rel ? "page" : undefined}
      className={`${box} ${
        target === page && !rel
          ? "bg-primary font-semibold text-on-primary"
          : "border border-border hover:border-primary"
      }`}
    >
      {children}
    </ResultsLink>
  );

  const numbers = (items: PageItem[], visibility: string) =>
    items.map((item, index) => (
      <li key={`${visibility}-${index}`} className={visibility}>
        {item === "gap" ? (
          <span aria-hidden="true" className={`${box} px-1 text-muted`}>
            …
          </span>
        ) : (
          link(item, item, `Página ${item}`)
        )}
      </li>
    ));

  const step = (target: number, arrow: string, text: string, rel: string) => {
    const content = (
      <>
        <span aria-hidden="true">{arrow}</span>
        <span className="hidden sm:ml-1 sm:inline">{text}</span>
      </>
    );
    return target >= 1 && target <= totalPages ? (
      link(target, content, `${text} (página ${target})`, rel)
    ) : (
      <span aria-disabled="true" className={`${box} border border-border text-muted opacity-60`}>
        {content}
        <span className="sr-only sm:hidden">{text}</span>
      </span>
    );
  };

  return (
    <nav aria-label="Paginación" className="flex justify-center pt-4">
      <ul className="flex items-center gap-1">
        <li>{step(page - 1, "‹", "Anterior", "prev")}</li>
        {numbers(pageItems(page, totalPages, 0), "sm:hidden")}
        {numbers(pageItems(page, totalPages, 1), "hidden sm:block")}
        <li>{step(page + 1, "›", "Siguiente", "next")}</li>
      </ul>
    </nav>
  );
}
