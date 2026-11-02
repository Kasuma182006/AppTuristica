import type { CatalogItem } from "@/modules/catalogs/types";

/**
 * The municipality a site slug ends with (slugs are "name-municipality", HU-24), e.g.
 * "salto-la-union" → La Unión; the longest match wins ("el-cerrito" over "cerrito"). Undefined
 * when none matches, e.g. a mistyped address.
 */
export function municipalityFromSlug(
  slug: string,
  municipalities: readonly CatalogItem[],
): CatalogItem | undefined {
  let found: CatalogItem | undefined;
  for (const municipality of municipalities) {
    const matches = slug === municipality.slug || slug.endsWith(`-${municipality.slug}`);
    if (matches && municipality.slug.length > (found?.slug.length ?? 0)) found = municipality;
  }
  return found;
}

/** The site slug in a /lugar/{slug} path, if it is one. */
export function slugFromPath(path: string): string | undefined {
  return /^\/lugar\/([^/?#]+)\/?$/.exec(path)?.[1];
}
