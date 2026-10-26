/** Successful API responses wrap their payload in `data`. */
export function apiData<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated lists add `meta` next to `data`. */
export function apiPage<T>(items: T[], meta: PageMeta, init?: ResponseInit): Response {
  return Response.json({ data: items, meta }, init);
}

export const API_ERROR_CODES = [
  "bad_request",
  "not_found",
  "rate_limited",
  "internal_error",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** API errors share one shape: `{ error: { code, message } }` (message in Spanish). */
export function apiError(status: number, code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
