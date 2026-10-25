import { describe, expect, it } from "vitest";
import { scoreSites, summarizeConfidence } from "./confidence";
import type { DescribedSite, ScoredSite } from "./types";

const point = { lat: 3.6, lon: -76.7 };

function site(overrides: Partial<DescribedSite> = {}): DescribedSite {
  return {
    name: "Sitio",
    placeTypeSlug: "cerro",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    wikidataId: null,
    elements: [{ externalId: "node/1", point, tags: {} }],
    point,
    municipalityId: 3,
    inProtectedArea: false,
    privateProperty: false,
    sensitivity: "normal",
    wikidata: null,
    photos: [],
    description: "Cerro en Dagua, Valle del Cauca.",
    ...overrides,
  };
}

const photo = {
  url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Lago_Calima.jpg",
  author: "Autor",
  license: "CC BY-SA 4.0",
  licenseUrl: null,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Lago_Calima.jpg",
  width: null,
  height: null,
};

describe("scoreSites", () => {
  it("scores an OSM-only site from its fields", () => {
    const [scored] = scoreSites([site({ altitudeM: 1800 })]);
    expect(scored?.confidence).toBe(35);
  });

  it("counts every OSM element of a site as one source", () => {
    const elements = [
      { externalId: "way/1", point, tags: {} },
      { externalId: "way/2", point, tags: {} },
    ];
    expect(scoreSites([site({ elements })])[0]?.confidence).toBe(30);
  });

  it("counts an existing Wikidata item as a second source, and its Wikipedia article", () => {
    const wikidata = {
      id: "Q1",
      description: "embalse en Colombia",
      wikipediaUrl: "https://es.wikipedia.org/wiki/Lago_Calima",
      image: null,
      commonsCategory: null,
    };
    expect(scoreSites([site({ wikidataId: "Q1", wikidata })])[0]?.confidence).toBe(55);
    // An OSM tag pointing to a missing item adds nothing.
    expect(scoreSites([site({ wikidataId: "Q1" })])[0]?.confidence).toBe(30);
  });

  it("adds the photo points once, whatever the number of photos", () => {
    expect(scoreSites([site({ photos: [photo, photo] })])[0]?.confidence).toBe(50);
  });
});

describe("summarizeConfidence", () => {
  it("counts sites per score, lowest first", () => {
    const scored = [55, 30, 35, 30].map((confidence) => ({ ...site(), confidence }) as ScoredSite);
    expect(summarizeConfidence(scored)).toBe("confidence: 30 → 2 sites, 35 → 1, 55 → 1");
  });
});
