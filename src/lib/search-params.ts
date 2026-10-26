/** A page's `searchParams` as Next.js gives them: a repeated key arrives as an array. */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/** Converts page `searchParams` to URLSearchParams, keeping repeated keys repeated. */
export function toUrlSearchParams(params: PageSearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value ?? []].flat()) result.append(key, item);
  }
  return result;
}
