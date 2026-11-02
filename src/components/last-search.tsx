"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { municipalityPath } from "@/lib/routes";
import type { CatalogItem } from "@/modules/catalogs/types";
import { EXPLORE_PATH } from "./filter-url";

/** The tab's last list of sites (/explorar or a municipality page); per tab, like the history. */
const STORAGE_KEY = "ultima-busqueda";

function isOwnList(href: string): boolean {
  return (
    href === EXPLORE_PATH ||
    href.startsWith(`${EXPLORE_PATH}?`) ||
    /^\/lugar\/[a-z0-9-]+(?:\?pagina=\d+)?$/.test(href)
  );
}

function readLastSearch(): string | null {
  try {
    const href = sessionStorage.getItem(STORAGE_KEY);
    // Only our own lists: the value is never used as an arbitrary link.
    return href !== null && isOwnList(href) ? href : null;
  } catch {
    // Storage blocked by the browser: the link falls back to the municipality.
    return null;
  }
}

/** Remembers the list on screen, so a site page can go back to it (HU-59, HU-70). */
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
 * from elsewhere (a search engine, a shared link) get the municipality page (HU-70).
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
    <Link href={municipalityPath(municipality.slug)} prefetch={false} className={linkClass}>
      <span aria-hidden="true">←</span> Más sitios en {municipality.name}
    </Link>
  );
}
