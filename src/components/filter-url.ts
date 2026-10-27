import { FILTER_PARAMS } from "@/modules/places/filters";

/** Where the search panel leads (RF-04). */
export const EXPLORE_PATH = "/explorar";

/** The values of a comma-separated parameter, e.g. "cascada,rio" → ["cascada", "rio"]. */
export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Encodes a value for the URL but leaves commas readable: ?tipo=cascada,rio, not cascada%2Crio. */
const encodeValue = (value: string) => encodeURIComponent(value).replaceAll("%2C", ",");

/**
 * The /explorar address for the panel's values (HU-51): the filters in a fixed order, then the
 * other parameters of the current address (order, page size, view) except the page, since a new
 * filter starts again at page 1.
 */
export function exploreHref(
  values: Readonly<Record<string, string>>,
  current: URLSearchParams,
): string {
  const parts: string[] = [];
  for (const param of FILTER_PARAMS) {
    const value = values[param];
    if (value) parts.push(`${param}=${encodeValue(value)}`);
  }
  for (const [param, value] of current) {
    if ((FILTER_PARAMS as readonly string[]).includes(param) || param === "pagina") continue;
    parts.push(`${encodeURIComponent(param)}=${encodeValue(value)}`);
  }
  return parts.length > 0 ? `${EXPLORE_PATH}?${parts.join("&")}` : EXPLORE_PATH;
}
