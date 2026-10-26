import { apiData, apiError } from "@/lib/api-response";
import { corsPreflight, publicApi } from "@/lib/public-api";
import { getCatalogs } from "@/modules/catalogs/service";

// Catalogs only change when seeds run: let the CDN serve them for an hour.
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

/** HU-35 (RF-28): values of the Lugar, Tipo and Actividad filters. */
export const GET = publicApi(async () => {
  try {
    const catalogs = await getCatalogs();
    return apiData(catalogs, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (error) {
    console.error("GET /api/v1/catalogs failed", error);
    return apiError(500, "internal_error", "No se pudieron cargar los catálogos.");
  }
});

export const OPTIONS = corsPreflight;
