import { openApiDocument } from "@/lib/openapi";
import { CORS_HEADERS, corsPreflight } from "@/lib/public-api";

/**
 * HU-42 (RF-29): the OpenAPI document. Static (built with the app, no database), so it is not
 * counted against the rate limit.
 */
export function GET(): Response {
  return Response.json(openApiDocument, {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}

export const OPTIONS = corsPreflight;
