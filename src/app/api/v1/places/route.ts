import { connection, type NextRequest } from "next/server";
import { apiData, apiError } from "@/lib/api-response";
import { parsePlaceFilters } from "@/modules/places/filters";
import { searchPlaces } from "@/modules/places/service";

/** HU-36 (RF-26): published sites matching the filters, e.g. ?lugar=dagua&tipo=cascada,rio. */
export async function GET(request: NextRequest): Promise<Response> {
  await connection();

  const filters = parsePlaceFilters(request.nextUrl.searchParams);
  if (!filters.ok) return apiError(400, "bad_request", filters.message);

  try {
    const result = await searchPlaces(filters.value);
    if (!result.ok) return apiError(400, "bad_request", result.message);
    return apiData(result.value);
  } catch (error) {
    console.error("GET /api/v1/places failed", error);
    return apiError(500, "internal_error", "No se pudieron cargar los sitios.");
  }
}
