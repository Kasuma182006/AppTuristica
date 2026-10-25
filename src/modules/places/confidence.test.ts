import { describe, expect, it } from "vitest";
import { CONFIDENCE_POINTS, confidenceScore, type ConfidenceInput } from "./confidence";

const minimal: ConfidenceInput = {
  sources: ["openstreetmap"],
  difficulty: null,
  altitudeM: null,
  cost: null,
  photoCount: 0,
  wikipediaUrl: null,
};

describe("confidenceScore", () => {
  it("gives the base to a site with one source and no optional field", () => {
    expect(confidenceScore(minimal)).toBe(30);
    expect(confidenceScore({ ...minimal, sources: ["community"] })).toBe(30);
  });

  it("adds the points of each filled field, the same for every field value", () => {
    expect(confidenceScore({ ...minimal, altitudeM: 2100 })).toBe(35);
    expect(confidenceScore({ ...minimal, altitudeM: 0 })).toBe(35);
    expect(confidenceScore({ ...minimal, difficulty: "easy" })).toBe(40);
    expect(confidenceScore({ ...minimal, cost: "free" })).toBe(40);
    expect(confidenceScore({ ...minimal, photoCount: 1 })).toBe(50);
    expect(confidenceScore({ ...minimal, photoCount: 5 })).toBe(50);
  });

  it("adds points for each extra source, counting repeated kinds once", () => {
    expect(confidenceScore({ ...minimal, sources: ["openstreetmap", "openstreetmap"] })).toBe(30);
    expect(
      confidenceScore({
        ...minimal,
        sources: ["openstreetmap", "wikidata"],
        wikipediaUrl: "https://es.wikipedia.org/wiki/Lago_Calima",
      }),
    ).toBe(55);
  });

  it("reaches 100 with two sources and every field", () => {
    expect(
      confidenceScore({
        sources: ["openstreetmap", "wikidata"],
        difficulty: "hard",
        altitudeM: 4080,
        cost: "paid",
        photoCount: 3,
        wikipediaUrl: "https://es.wikipedia.org/wiki/Farallones_de_Cali",
      }),
    ).toBe(100);
  });

  it("never goes above 100", () => {
    expect(
      confidenceScore({
        sources: ["openstreetmap", "wikidata", "community"],
        difficulty: "hard",
        altitudeM: 4080,
        cost: "paid",
        photoCount: 3,
        wikipediaUrl: "https://es.wikipedia.org/wiki/Farallones_de_Cali",
      }),
    ).toBe(100);
  });

  it("fails for a site without sources", () => {
    expect(() => confidenceScore({ ...minimal, sources: [] })).toThrow("at least one source");
  });

  it("documents points that add up to 100 for two sources", () => {
    const { base, extraSource, ...fields } = CONFIDENCE_POINTS;
    const total = base + extraSource + Object.values(fields).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});
