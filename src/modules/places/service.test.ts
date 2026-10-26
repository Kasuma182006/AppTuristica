import { afterEach, describe, expect, it, vi } from "vitest";
import type { Catalogs } from "@/modules/catalogs/types";
import type { PlaceRow } from "./repository";
import type { PlaceQuery } from "./types";

const findPlaces = vi.fn<() => Promise<{ rows: PlaceRow[]; total: number }>>();
const catalogs: Catalogs = {
  municipalities: [{ slug: "dagua", name: "Dagua" }],
  placeTypes: [{ slug: "cascada", name: "Cascada" }],
  activities: [],
};

vi.mock("@/lib/db", () => ({ getDb: () => undefined }));
vi.mock("@/modules/catalogs/service", () => ({ getCatalogs: () => Promise.resolve(catalogs) }));
vi.mock("./repository", () => ({ findPlaces: () => findPlaces() }));

const { searchPlaces, toPlaceSummary } = await import("./service");

const row: PlaceRow = {
  id: 7,
  slug: "salto-de-bitaco-dagua",
  name: "Salto de Bitaco",
  municipality: { slug: "dagua", name: "Dagua" },
  placeType: { slug: "cascada", name: "Cascada" },
  activities: [{ slug: "senderismo", name: "Senderismo" }],
  difficulty: "moderate",
  origin: "open_data",
  inProtectedArea: false,
  privateProperty: false,
  confidence: 35,
};

describe("toPlaceSummary", () => {
  it("returns the public fields with Spanish filter values", () => {
    expect(toPlaceSummary(row)).toEqual({
      slug: "salto-de-bitaco-dagua",
      name: "Salto de Bitaco",
      municipality: { slug: "dagua", name: "Dagua" },
      placeType: { slug: "cascada", name: "Cascada" },
      activities: [{ slug: "senderismo", name: "Senderismo" }],
      difficulty: "moderada",
      origin: "abiertas",
      restricted: false,
      confidence: 35,
    });
  });

  it("leaves out the internal id", () => {
    expect(toPlaceSummary(row)).not.toHaveProperty("id");
  });

  it("returns null when the difficulty is unknown", () => {
    expect(toPlaceSummary({ ...row, difficulty: null }).difficulty).toBeNull();
  });

  it("maps community sites", () => {
    expect(toPlaceSummary({ ...row, origin: "community" }).origin).toBe("comunidad");
  });

  it.each([
    ["in a protected area", { inProtectedArea: true }],
    ["on private property", { privateProperty: true }],
  ])("marks sites %s as restricted", (_label, flags) => {
    expect(toPlaceSummary({ ...row, ...flags }).restricted).toBe(true);
  });
});

describe("searchPlaces", () => {
  const query: PlaceQuery = {
    filters: { freeAccessOnly: false },
    sort: "confianza",
    page: 1,
    pageSize: 24,
  };

  afterEach(() => {
    findPlaces.mockReset();
  });

  it.each([
    [0, 0],
    [1, 1],
    [24, 1],
    [25, 2],
    [529, 23],
  ])("with %i matching sites returns %i pages", async (total, totalPages) => {
    findPlaces.mockResolvedValueOnce({ rows: total > 0 ? [row] : [], total });

    const result = await searchPlaces(query);

    expect(result).toMatchObject({ ok: true, value: { total, totalPages, page: 1, pageSize: 24 } });
  });

  it("returns an empty page past the last one", async () => {
    findPlaces.mockResolvedValueOnce({ rows: [], total: 529 });

    const result = await searchPlaces({ ...query, page: 99 });

    expect(result).toEqual({
      ok: true,
      value: { items: [], total: 529, page: 99, pageSize: 24, totalPages: 23 },
    });
  });

  it("fails without querying when a slug does not exist", async () => {
    const result = await searchPlaces({
      ...query,
      filters: { placeTypes: ["volcan"], freeAccessOnly: false },
    });

    expect(result).toEqual({
      ok: false,
      message: 'tipo: "volcan" no existe; consulta /api/v1/catalogs.',
    });
    expect(findPlaces).not.toHaveBeenCalled();
  });
});
