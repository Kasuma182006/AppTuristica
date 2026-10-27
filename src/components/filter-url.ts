import { FILTER_PARAMS } from "@/modules/places/filters";
import { SORT_SLUGS, type PlaceSort } from "@/modules/places/types";

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

/** The filters of /explorar values alone, e.g. "/explorar?tipo=cascada,rio": comparable keys. */
export function filterKey(values: Readonly<Record<string, string>>): string {
  return exploreHref(values, new URLSearchParams());
}

/** The filter key of an address's query string. */
export function filterKeyOf(params: URLSearchParams): string {
  return filterKey(
    Object.fromEntries(FILTER_PARAMS.map((param) => [param, params.get(param)?.trim() ?? ""])),
  );
}

/** The /explorar address of another results page (HU-54); page 1 is left out. */
export function pageHref(current: URLSearchParams, page: number): string {
  const filters = Object.fromEntries(
    FILTER_PARAMS.map((param) => [param, current.get(param) ?? ""]),
  );
  const href = exploreHref(filters, current);
  if (page <= 1) return href;
  return `${href}${href.includes("?") ? "&" : "?"}pagina=${page}`;
}

/**
 * The /explorar address with another order (HU-53), keeping the filters and starting again at
 * page 1. The default order is left out of the address.
 */
export function sortHref(current: URLSearchParams, sort: PlaceSort): string {
  const next = new URLSearchParams(current);
  if (sort === SORT_SLUGS[0]) next.delete("orden");
  else next.set("orden", sort);
  const filters = Object.fromEntries(FILTER_PARAMS.map((param) => [param, next.get(param) ?? ""]));
  return exploreHref(filters, next);
}
