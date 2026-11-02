/** The Terms of use (HU-78, HU-88). */
export const TERMS_PATH = "/terminos";

/** Address of a site page (HU-59), e.g. /sitio/embalse-de-calima. */
export function placePath(slug: string): string {
  return `/sitio/${slug}`;
}

/** Address of a municipality page (HU-70), e.g. /lugar/cali?pagina=2; page 1 is left out. */
export function municipalityPath(slug: string, page = 1): string {
  return page > 1 ? `/lugar/${slug}?pagina=${page}` : `/lugar/${slug}`;
}
