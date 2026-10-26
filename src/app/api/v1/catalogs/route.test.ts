import { afterEach, describe, expect, it, vi } from "vitest";
import type { Catalogs } from "@/modules/catalogs/types";

const getCatalogs = vi.fn<() => Promise<Catalogs>>();

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/modules/catalogs/service", () => ({ getCatalogs: () => getCatalogs() }));

const { GET } = await import("./route");

const catalogs: Catalogs = {
  municipalities: [
    { slug: "cali", name: "Cali" },
    { slug: "el-aguila", name: "El Águila" },
  ],
  placeTypes: [{ slug: "cascada", name: "Cascada" }],
  activities: [{ slug: "bano-en-rio", name: "Baño en río" }],
};

describe("GET /api/v1/catalogs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the catalogs wrapped in data", async () => {
    getCatalogs.mockResolvedValueOnce(catalogs);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: catalogs });
  });

  it("lets the CDN cache the response", async () => {
    getCatalogs.mockResolvedValueOnce(catalogs);

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("returns a 500 error with the API error format when the query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getCatalogs.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBeNull();
    expect(await response.json()).toEqual({
      error: { code: "internal_error", message: "No se pudieron cargar los catálogos." },
    });
  });
});
