"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { CatalogItem } from "@/modules/catalogs/types";
import { EXPLORE_PATH } from "./filter-url";

/** The /explorar address of the tab's last search; per tab, like the browser history. */
const STORAGE_KEY = "ultima-busqueda";

function readLastSearch(): string | null {
  try {
    const href = sessionStorage.getItem(STORAGE_KEY);
    // Only our own search page: the value is never used as an arbitrary link.
    return href === EXPLORE_PATH || href?.startsWith(`${EXPLORE_PATH}?`) ? href : null;
  } catch {
    // Storage blocked by the browser: the link falls back to the municipality.
    return null;
  }
}

/** Remembers the search on screen, so a site page can go back to it (HU-59). */
export function RememberSearch({ href }: { href: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, href);
    } catch {
      // Storage blocked: nothing to remember.
    }
  }, [href]);
  return null;
}

const noSubscription = () => () => {};

const linkClass =
  "inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline";

/**
 * Back to the visitor's last search, with its filters, order, page and view. Visitors who came
 * from elsewhere (a search engine, a shared link) get the sites of the same municipality.
 */
export function BackToResults({ municipality }: { municipality: CatalogItem }) {
  // The server does not know the tab's storage: it renders the municipality link.
  const lastSearch = useSyncExternalStore(noSubscription, readLastSearch, () => null);

  if (lastSearch) {
    return (
      <Link href={lastSearch} prefetch={false} className={linkClass}>
        <span aria-hidden="true">←</span> Volver a los resultados
      </Link>
    );
  }
  return (
    <Link
      href={`${EXPLORE_PATH}?lugar=${encodeURIComponent(municipality.slug)}`}
      prefetch={false}
      className={linkClass}
    >
      <span aria-hidden="true">←</span> Explorar sitios en {municipality.name}
    </Link>
  );
}
