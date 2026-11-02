import type { MetadataRoute } from "next";
import { municipalityPath, placePath } from "./routes";
import { SITE_URL } from "./site";

/** Pages without data behind them. /explorar and /proponer are noindex, so they stay out. */
const STATIC_PATHS = ["/", "/api-docs"];

export interface SitemapData {
  /** Published sites only; a hidden site must never reach the sitemap. */
  places: { slug: string; updatedAt: Date }[];
  /** Municipalities with published sites: a page with none has nothing to index. */
  municipalitySlugs: string[];
}

/**
 * Every address to index (HU-72). Only sites carry a last change: the ingest bumps `updated_at`
 * just when a site really changes, and no such date exists for the other pages. Municipalities
 * list their first page only: the sites of later pages are all listed here anyway.
 */
export function sitemapEntries({ places, municipalitySlugs }: SitemapData): MetadataRoute.Sitemap {
  return [
    ...STATIC_PATHS.map((path) => ({ url: new URL(path, SITE_URL).href })),
    ...municipalitySlugs.map((slug) => ({ url: `${SITE_URL}${municipalityPath(slug)}` })),
    ...places.map(({ slug, updatedAt }) => ({
      url: `${SITE_URL}${placePath(slug)}`,
      lastModified: updatedAt,
    })),
  ];
}
