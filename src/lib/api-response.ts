/** Successful API responses wrap their payload in `data`. */
export function apiData<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

export type ApiErrorCode = "bad_request" | "not_found" | "rate_limited" | "internal_error";

/** API errors share one shape: `{ error: { code, message } }` (message in Spanish). */
export function apiError(status: number, code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
