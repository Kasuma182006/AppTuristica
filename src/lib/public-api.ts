import { after, connection, type NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { clientIp, hashIp } from "@/lib/ip-hash";
import {
  API_RATE_LIMIT,
  consumeRateLimit,
  deleteExpiredRateLimits,
  type RateLimitResult,
} from "@/lib/rate-limit";

/** The API is public and read-only, without cookies: any site may call it from a browser. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
  "Access-Control-Max-Age": "86400",
} as const;

function withCors(response: Response): Response {
  for (const [name, value] of Object.entries(CORS_HEADERS)) response.headers.set(name, value);
  return response;
}

export function tooManyRequests(retryAfterS: number): Response {
  const response = apiError(
    429,
    "rate_limited",
    `Demasiadas peticiones. Intenta de nuevo en ${retryAfterS} s.`,
  );
  response.headers.set("Retry-After", String(retryAfterS));
  return response;
}

/**
 * Counts the request against the API limit (HU-41). If the counter cannot be reached (database
 * down, missing secret) the request goes through and the error is logged: the API stays up.
 */
async function checkRateLimit(request: NextRequest): Promise<RateLimitResult | undefined> {
  try {
    const db = getDb();
    const result = await consumeRateLimit(db, hashIp(clientIp(request.headers)), API_RATE_LIMIT);
    if (result.newWindow) {
      after(() =>
        deleteExpiredRateLimits(db).catch((error: unknown) =>
          console.error("Deleting expired rate limits failed", error),
        ),
      );
    }
    return result;
  } catch (error) {
    console.error("Rate limit check failed; letting the request through", error);
    return undefined;
  }
}

/**
 * Wraps a `GET` handler of /api/v1: request-time rendering, the per-IP limit (429 with
 * Retry-After) and CORS headers on every response.
 */
export function publicApi<Context>(
  handler: (request: NextRequest, context: Context) => Promise<Response>,
): (request: NextRequest, context: Context) => Promise<Response> {
  return async (request, context) => {
    // Never at build time (CI has no database).
    await connection();

    const limit = await checkRateLimit(request);
    if (limit && !limit.allowed) return withCors(tooManyRequests(limit.retryAfterS));
    return withCors(await handler(request, context));
  };
}

/** Answers CORS preflight requests (`OPTIONS`) of the API. */
export function corsPreflight(): Response {
  return withCors(new Response(null, { status: 204 }));
}
