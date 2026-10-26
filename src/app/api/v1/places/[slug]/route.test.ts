import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaceDetail } from "@/modules/places/types";

const getPlace = vi.fn<(slug: string) => Promise<PlaceDetail | undefined>>();

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: () => Promise.resolve(),
}));
vi.mock("@/modules/places/service", () => ({
  getPlace: (slug: string) => getPlace(slug),
}));

const { GET } = await import("./route");

const get = (slug: string) =>
  GET(new NextRequest(`http://localhost/api/v1/places/${slug}`), {
    params: Promise.resolve({ slug }),
  });

const place: PlaceDetail = {
  slug: "rio-cali",
  name: "Río Cali",
  municipality: { slug: "cali", name: "Cali" },
  placeType: { slug: "rio", name: "Río" },
  activities: [],
  difficulty: null,
  origin: "abiertas",
  confidence: 30,
  location: { lat: 3.451234, lng: -76.532101, approximate: false, radiusM: null },
  description: "Río en Cali.",
  wikidataDescription: null,
  wikipediaUrl: null,
  altitudeM: null,
  cost: null,
  fragile: false,
  inProtectedArea: false,
  privateProperty: false,
  photos: [],
  sources: [{ source: "openstreetmap", url: "https://www.openstreetmap.org/way/1" }],
  updatedAt: "2026-10-25T03:00:00.000Z",
};

describe("GET /api/v1/places/{slug}", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getPlace.mockReset();
  });

  it("returns the site wrapped in data", async () => {
    getPlace.mockResolvedValueOnce(place);

    const response = await get("rio-cali");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: place });
    expect(getPlace).toHaveBeenCalledWith("rio-cali");
  });

  it("returns 404 when the site does not exist or is hidden", async () => {
    getPlace.mockResolvedValueOnce(undefined);

    const response = await get("no-existe");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: 'No existe un sitio con el slug "no-existe".' },
    });
  });

  it("returns 500 with the API error format when the query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getPlace.mockRejectedValueOnce(new Error("connection refused"));

    const response = await get("rio-cali");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal_error", message: "No se pudo cargar el sitio." },
    });
  });
});
