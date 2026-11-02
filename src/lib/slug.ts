// URL slugs for places and sites (e.g. /lugar/el-aguila, /sitio/embalse-de-calima).
// Lowercase ASCII words joined by hyphens.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Base slug of a new site (HU-31): its name and municipality, e.g. "rio-cauca-cali", without
 * repeating the municipality when the name already ends with it ("rio-cali", not "rio-cali-cali").
 */
export function siteSlug(name: string, municipalitySlug: string): string {
  const nameSlug = slugify(name);
  if (nameSlug === municipalitySlug || nameSlug.endsWith(`-${municipalitySlug}`)) return nameSlug;
  return `${nameSlug}-${municipalitySlug}`;
}

/** The base slug, or base-2, base-3… when taken; the result is added to `taken`. */
export function claimSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
