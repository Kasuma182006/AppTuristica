/**
 * Thumbnail widths Commons serves for any file; other widths are refused (HTTP 400). Commons
 * answers 429 to many downloads in a row, so cards stay at 500 and the gallery loads one large
 * photo at a time (HU-60).
 */
export const COMMONS_THUMB_WIDTHS = [330, 500, 960] as const;

export type CommonsThumbWidth = (typeof COMMONS_THUMB_WIDTHS)[number];

const COMMONS_FILE =
  /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+\.(?:jpe?g|png|webp))$/i;

/**
 * A Commons thumbnail at least `requested` pixels wide (up to `largest`), e.g.
 * .../commons/thumb/1/14/Lago_Calima.jpg/500px-Lago_Calima.jpg. Falls back to the file itself,
 * without tracking parameters, when it is not a Commons image or is already that small.
 */
export function commonsThumbUrl(
  url: string,
  requested: number,
  originalWidth: number | null,
  largest: CommonsThumbWidth = 500,
): string {
  const file = url.split("?")[0] ?? url;
  const match = COMMONS_FILE.exec(file);
  const width =
    COMMONS_THUMB_WIDTHS.find((allowed) => allowed >= requested && allowed <= largest) ?? largest;
  if (!match || (originalWidth !== null && width >= originalWidth)) return file;

  const [, hash1, hash2, name] = match;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash1}/${hash2}/${name}/${width}px-${name}`;
}

/**
 * The author as a person reads it. Commons sometimes only has a guess, e.g. "No machine-readable
 * author provided. Chilangoco assumed (based on copyright claims)." → "Chilangoco".
 */
export function displayAuthor(author: string): string {
  const assumed = /^No machine-readable author provided\.\s*(.+?)\s+assumed\b/i.exec(author);
  return (assumed?.[1] ?? author).trim();
}
