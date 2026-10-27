import { afterEach, describe, expect, it, vi } from "vitest";
import type { Catalogs } from "@/modules/catalogs/types";
import type { PhotoRow, PlaceDetailRow, PlacePointRow, PlaceSummaryRow } from "./repository";
import type { PlaceFilters, PlaceQuery } from "./types";

const findPlaces = vi.fn<() => Promise<{ rows: PlaceSummaryRow[]; total: number }>>();
const findPlaceBySlug = vi.fn<(slug: string) => Promise<PlaceDetailRow | undefined>>();
const countPlaces = vi.fn<(filters: PlaceFilters) => Promise<number>>();
const findPlacePoints = vi.fn<() => Promise<PlacePointRow[]>>();
const catalogs: Catalogs = {
  municipalities: [{ slug: "dagua", name: "Dagua" }],
  placeTypes: [{ slug: "cascada", name: "Cascada" }],
  activities: [],
};

vi.mock("@/lib/db", () => ({ getDb: () => undefined }));
vi.mock("@/modules/catalogs/service", () => ({ getCatalogs: () => Promise.resolve(catalogs) }));
vi.mock("./repository", () => ({
  countPlaces: (_db: unknown, filters: PlaceFilters) => countPlaces(filters),
  findPlaces: () => findPlaces(),
  findPlacePoints: () => findPlacePoints(),
  findPlaceBySlug: (_db: unknown, slug: string) => findPlaceBySlug(slug),
}));

const {
  countWithoutEachFilter,
  getPlace,
  searchPlacePoints,
  searchPlaces,
  toPlaceDetail,
  toPlaceSummary,
} = await import("./service");

const row: PlaceSummaryRow = {
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
  sensitivity: "normal",
  location: { lat: 3.6123456789, lng: -76.6987654321 },
  cover: null,
};

const photo: PhotoRow = {
  url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/A.jpg",
  width: 800,
  height: 600,
  author: "Ana",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
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
      location: { lat: 3.612346, lng: -76.698765, approximate: false, radiusM: null },
      photo: null,
    });
  });

  it("includes the cover photo (HU-52)", () => {
    expect(toPlaceSummary({ ...row, cover: photo }).photo).toEqual(photo);
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

describe("countWithoutEachFilter (HU-55)", () => {
  afterEach(() => countPlaces.mockReset());

  it("counts the sites without each active filter, most first, leaving out zeros", async () => {
    countPlaces.mockImplementation(async (filters) => {
      if (!filters.placeTypes) return 313;
      if (!filters.activities) return 32;
      return 0;
    });
    const filters: PlaceFilters = {
      municipality: "dagua",
      placeTypes: ["cascada"],
      activities: ["senderismo"],
      freeAccessOnly: false,
    };

    expect(await countWithoutEachFilter(filters)).toEqual([
      { param: "tipo", total: 313 },
      { param: "actividad", total: 32 },
    ]);
    expect(countPlaces).toHaveBeenCalledTimes(3);
  });

  it("queries nothing without filters", async () => {
    expect(await countWithoutEachFilter({ freeAccessOnly: false })).toEqual([]);
    expect(countPlaces).not.toHaveBeenCalled();
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

describe("toPlaceDetail", () => {
  const detailRow: PlaceDetailRow = {
    ...row,
    description: "Cascada en Dagua.",
    wikidataDescription: "cascada en Colombia",
    wikipediaUrl: "https://es.wikipedia.org/wiki/Salto_de_Bitaco",
    altitudeM: 1450,
    cost: "free",
    inProtectedArea: true,
    updatedAt: new Date("2026-10-20T00:00:00Z"),
    photos: [
      {
        url: "https://upload.wikimedia.org/a.jpg",
        width: 800,
        height: 600,
        author: "Ana",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
      },
    ],
    sources: [
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/node/1",
        lastSeenAt: new Date("2026-10-25T03:00:00Z"),
      },
      {
        source: "wikidata",
        url: "https://www.wikidata.org/wiki/Q1",
        lastSeenAt: new Date("2026-10-18T03:00:00Z"),
      },
    ],
  };

  it("returns every field of the site page", () => {
    expect(toPlaceDetail(detailRow)).toEqual({
      slug: "salto-de-bitaco-dagua",
      name: "Salto de Bitaco",
      municipality: { slug: "dagua", name: "Dagua" },
      placeType: { slug: "cascada", name: "Cascada" },
      activities: [{ slug: "senderismo", name: "Senderismo" }],
      difficulty: "moderada",
      origin: "abiertas",
      confidence: 35,
      location: { lat: 3.612346, lng: -76.698765, approximate: false, radiusM: null },
      description: "Cascada en Dagua.",
      wikidataDescription: "cascada en Colombia",
      wikipediaUrl: "https://es.wikipedia.org/wiki/Salto_de_Bitaco",
      altitudeM: 1450,
      cost: "gratis",
      fragile: false,
      inProtectedArea: true,
      privateProperty: false,
      photos: detailRow.photos,
      sources: [
        { source: "openstreetmap", url: "https://www.openstreetmap.org/node/1" },
        { source: "wikidata", url: "https://www.wikidata.org/wiki/Q1" },
      ],
      updatedAt: "2026-10-25T03:00:00.000Z",
    });
  });

  it("leaves out the internal id and the list-only restricted flag", () => {
    const detail = toPlaceDetail(detailRow);

    expect(detail).not.toHaveProperty("id");
    expect(detail).not.toHaveProperty("restricted");
  });

  it("maps paid sites and missing data", () => {
    const detail = toPlaceDetail({
      ...detailRow,
      cost: "paid",
      altitudeM: null,
      wikidataDescription: null,
      wikipediaUrl: null,
    });

    expect(detail).toMatchObject({
      cost: "pago",
      altitudeM: null,
      wikidataDescription: null,
      wikipediaUrl: null,
    });
    expect(toPlaceDetail({ ...detailRow, cost: null }).cost).toBeNull();
  });

  it("names community sources in Spanish, without a link", () => {
    const detail = toPlaceDetail({
      ...detailRow,
      origin: "community",
      sources: [{ source: "community", url: null, lastSeenAt: new Date("2026-10-26T00:00:00Z") }],
    });

    expect(detail.sources).toEqual([{ source: "comunidad", url: null }]);
    expect(detail.origin).toBe("comunidad");
  });

  it("falls back to the site's last change when it has no sources", () => {
    expect(toPlaceDetail({ ...detailRow, sources: [] }).updatedAt).toBe("2026-10-20T00:00:00.000Z");
  });
});

describe("getPlace", () => {
  afterEach(() => {
    findPlaceBySlug.mockReset();
  });

  it("returns undefined for a missing or hidden site", async () => {
    findPlaceBySlug.mockResolvedValueOnce(undefined);

    expect(await getPlace("no-existe")).toBeUndefined();
    expect(findPlaceBySlug).toHaveBeenCalledWith("no-existe");
  });

  it.each(["Rio-Cali", "rio_cali", "rio--cali", ""])(
    "returns undefined for the malformed slug %j without querying",
    async (slug) => {
      expect(await getPlace(slug)).toBeUndefined();
      expect(findPlaceBySlug).not.toHaveBeenCalled();
    },
  );
});

describe("fragile sites (HU-39)", () => {
  const fragileRow: PlaceSummaryRow = {
    ...row,
    sensitivity: "fragile",
    inProtectedArea: true,
    location: { lat: 3.45123, lng: -76.60871 },
  };
  const approximate = { lat: 3.45, lng: -76.61, approximate: true, radiusM: 2000 };

  it("approximates the location in search results", () => {
    expect(toPlaceSummary(fragileRow).location).toEqual(approximate);
  });

  it("approximates the location on the map (HU-57)", async () => {
    findPlacePoints.mockResolvedValue([
      {
        slug: fragileRow.slug,
        name: fragileRow.name,
        municipality: "Dagua",
        placeType: fragileRow.placeType,
        sensitivity: "fragile",
        location: fragileRow.location,
      },
    ]);
    const points = await searchPlacePoints({ freeAccessOnly: false });

    expect(points.ok && points.value[0]?.location).toEqual(approximate);
    expect(JSON.stringify(points)).not.toContain("3.45123");
  });

  it("drops the link to the cover's Commons page in search results", () => {
    expect(toPlaceSummary({ ...fragileRow, cover: photo }).photo).toEqual({
      ...photo,
      sourceUrl: null,
    });
  });

  it("never includes the exact coordinates anywhere in the response", () => {
    const detail = toPlaceDetail({
      ...fragileRow,
      description: null,
      wikidataDescription: null,
      wikipediaUrl: null,
      altitudeM: null,
      cost: null,
      updatedAt: new Date("2026-10-20T00:00:00Z"),
      photos: [],
      sources: [],
    });
    const json = JSON.stringify([toPlaceSummary(fragileRow), detail]);

    expect(json).not.toContain("3.45123");
    expect(json).not.toContain("76.60871");
  });

  it("drops the links to sources and photo pages, keeping the attribution", () => {
    const detail = toPlaceDetail({
      ...fragileRow,
      description: null,
      wikidataDescription: "río de Colombia",
      wikipediaUrl: "https://es.wikipedia.org/wiki/R%C3%ADo_Cauca",
      altitudeM: null,
      cost: null,
      updatedAt: new Date("2026-10-20T00:00:00Z"),
      photos: [
        {
          url: "https://upload.wikimedia.org/a.jpg",
          width: 800,
          height: 600,
          author: "Ana",
          license: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
        },
      ],
      sources: [
        {
          source: "openstreetmap",
          url: "https://www.openstreetmap.org/node/1",
          lastSeenAt: new Date("2026-10-25T03:00:00Z"),
        },
        {
          source: "wikidata",
          url: "https://www.wikidata.org/wiki/Q1",
          lastSeenAt: new Date("2026-10-25T03:00:00Z"),
        },
      ],
    });

    expect(detail.fragile).toBe(true);
    expect(detail.location).toEqual(approximate);
    expect(detail.sources).toEqual([
      { source: "openstreetmap", url: null },
      { source: "wikidata", url: null },
    ]);
    expect(detail.photos).toEqual([
      {
        url: "https://upload.wikimedia.org/a.jpg",
        width: 800,
        height: 600,
        author: "Ana",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: null,
      },
    ]);
    // The article covers the whole river or lake, not the protected point.
    expect(detail.wikipediaUrl).toBe("https://es.wikipedia.org/wiki/R%C3%ADo_Cauca");
  });
});
