import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ParseResult } from "@/modules/places/filters";
import type { PlaceFilters, PlaceSummary } from "@/modules/places/types";

const searchPlaces = vi.fn<(filters: PlaceFilters) => Promise<ParseResult<PlaceSummary[]>>>();

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: () => Promise.resolve(),
}));
vi.mock("@/modules/places/service", () => ({
  searchPlaces: (filters: PlaceFilters) => searchPlaces(filters),
}));

const { GET } = await import("./route");

const get = (query: string) => GET(new NextRequest(`http://localhost/api/v1/places${query}`));

const place: PlaceSummary = {
  slug: "rio-cali",
  name: "Río Cali",
  municipality: { slug: "cali", name: "Cali" },
  placeType: { slug: "rio", name: "Río" },
  activities: [],
  difficulty: null,
  origin: "abiertas",
  restricted: false,
  confidence: 30,
};

describe("GET /api/v1/places", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    searchPlaces.mockReset();
  });

  it("returns the matching sites wrapped in data", async () => {
    searchPlaces.mockResolvedValueOnce({ ok: true, value: [place] });

    const response = await get("?lugar=cali&tipo=rio,cascada");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [place] });
    expect(searchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ municipality: "cali", placeTypes: ["rio", "cascada"] }),
    );
  });

  it("returns 400 for an invalid parameter without querying", async () => {
    const response = await get("?dificultad=extrema");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "bad_request",
        message: 'dificultad: "extrema" no es válido; usa facil, moderada, dificil, sin-dato.',
      },
    });
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("returns 400 for a slug missing from the catalogs", async () => {
    const message = 'tipo: "volcan" no existe; consulta /api/v1/catalogs.';
    searchPlaces.mockResolvedValueOnce({ ok: false, message });

    const response = await get("?tipo=volcan");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "bad_request", message } });
  });

  it("returns 500 with the API error format when the query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    searchPlaces.mockRejectedValueOnce(new Error("connection refused"));

    const response = await get("");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal_error", message: "No se pudieron cargar los sitios." },
    });
  });
});
