import type { NextRequest } from "next/server";
import { apiData, apiError } from "@/lib/api-response";
import { corsPreflight, publicApi } from "@/lib/public-api";
import { getPlace } from "@/modules/places/service";

/** HU-38 (RF-27): a published site with its photos, sources and activities. */
export const GET = publicApi(
  async (_request: NextRequest, { params }: RouteContext<"/api/v1/places/[slug]">) => {
    const { slug } = await params;

    try {
      const place = await getPlace(slug);
      if (!place) return apiError(404, "not_found", `No existe un sitio con el slug "${slug}".`);
      return apiData(place);
    } catch (error) {
      console.error("GET /api/v1/places/[slug] failed", error);
      return apiError(500, "internal_error", "No se pudo cargar el sitio.");
    }
  },
);

export const OPTIONS = corsPreflight;
