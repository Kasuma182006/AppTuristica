import { connection, type NextRequest } from "next/server";
import { apiError, apiPage } from "@/lib/api-response";
import { parsePlaceQuery } from "@/modules/places/filters";
import { searchPlaces } from "@/modules/places/service";

/**
 * HU-36, HU-37 (RF-26): one page of published sites matching the filters,
 * e.g. ?lugar=dagua&tipo=cascada,rio&orden=recientes&pagina=2.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await connection();

  const query = parsePlaceQuery(request.nextUrl.searchParams);
  if (!query.ok) return apiError(400, "bad_request", query.message);

  try {
    const result = await searchPlaces(query.value);
    if (!result.ok) return apiError(400, "bad_request", result.message);

    const { items, ...meta } = result.value;
    return apiPage(items, meta);
  } catch (error) {
    console.error("GET /api/v1/places failed", error);
    return apiError(500, "internal_error", "No se pudieron cargar los sitios.");
  }
}
