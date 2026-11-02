import { describe, expect, it } from "vitest";
import { confidenceMissing, formatDate, groupSources } from "./transparency";

describe("groupSources", () => {
  it("groups the elements of each source, keeping their links", () => {
    expect(
      groupSources([
        { source: "openstreetmap", url: "https://www.openstreetmap.org/way/1" },
        { source: "openstreetmap", url: "https://www.openstreetmap.org/way/2" },
        { source: "wikidata", url: "https://www.wikidata.org/wiki/Q853332" },
      ]),
    ).toEqual([
      {
        label: "OpenStreetMap",
        count: 2,
        urls: ["https://www.openstreetmap.org/way/1", "https://www.openstreetmap.org/way/2"],
      },
      { label: "Wikidata", count: 1, urls: ["https://www.wikidata.org/wiki/Q853332"] },
    ]);
  });

  it("keeps the count without links for fragile sites and the community", () => {
    expect(
      groupSources([
        { source: "openstreetmap", url: null },
        { source: "openstreetmap", url: null },
        { source: "comunidad", url: null },
      ]),
    ).toEqual([
      { label: "OpenStreetMap", count: 2, urls: [] },
      { label: "Comunidad", count: 1, urls: [] },
    ]);
  });
});

describe("confidenceMissing", () => {
  const bare = {
    sources: [{ source: "openstreetmap" as const, url: null }],
    photos: [],
    difficulty: null,
    cost: null,
    altitudeM: null,
    wikipediaUrl: null,
    fragile: false,
  };

  it("lists everything a base site lacks, in the formula's order", () => {
    expect(confidenceMissing(bare)).toEqual([
      "otra fuente",
      "fotos",
      "dificultad",
      "costo de entrada",
      "altitud",
      "artículo de Wikipedia",
    ]);
  });

  it("counts repeated elements of one source as one source", () => {
    const twoSegments = {
      ...bare,
      sources: [
        { source: "openstreetmap" as const, url: null },
        { source: "openstreetmap" as const, url: null },
      ],
    };
    expect(confidenceMissing(twoSegments)).toContain("otra fuente");
  });

  it("is empty for a complete site", () => {
    expect(
      confidenceMissing({
        ...bare,
        sources: [
          { source: "openstreetmap", url: null },
          { source: "wikidata", url: null },
        ],
        photos: [
          {
            url: "https://upload.wikimedia.org/a.jpg",
            width: 1,
            height: 1,
            author: "Ana",
            license: "CC0",
            licenseUrl: null,
            sourceUrl: null,
          },
        ],
        difficulty: "facil",
        cost: "gratis",
        altitudeM: 1000,
        wikipediaUrl: "https://es.wikipedia.org/wiki/A",
      }),
    ).toEqual([]);
  });

  it("does not claim a fragile site lacks Wikipedia: its link is hidden", () => {
    expect(confidenceMissing({ ...bare, fragile: true })).not.toContain("artículo de Wikipedia");
  });
});

describe("formatDate", () => {
  it("writes the day in Colombia", () => {
    expect(formatDate("2026-10-25T03:00:00.000Z")).toBe("24 de octubre de 2026");
    expect(formatDate("2026-10-25T15:00:00.000Z")).toBe("25 de octubre de 2026");
  });
});
