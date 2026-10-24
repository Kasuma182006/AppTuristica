import { describe, expect, it } from "vitest";
import type { CandidatePlace } from "../../pipeline/types";
import { summarizeLocation, summarizeNormalization } from ".";

function candidate(placeTypeSlug: string, name: string | null, segments: number): CandidatePlace {
  return {
    name,
    placeTypeSlug,
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    elements: Array.from({ length: segments }, (_, i) => ({
      externalId: `way/${i + 1}`,
      point: null,
      tags: {},
    })),
  };
}

describe("summarizeNormalization", () => {
  it("counts candidates, river segments and discards by reason", () => {
    expect(
      summarizeNormalization(
        [
          candidate("rio", "Río Cali", 3),
          candidate("rio", null, 1),
          candidate("cascada", "La Chorrera", 1),
        ],
        [
          { externalId: "way/8", reason: "canal" },
          { externalId: "way/9", reason: "canal" },
          { externalId: "relation/1", reason: "duplicate-river-relation" },
        ],
      ),
    ).toBe(
      "3 candidates (1 named rivers from 3 segments); 3 discarded (canal: 2, duplicate-river-relation: 1)",
    );
  });

  it("omits the reasons when nothing was discarded", () => {
    expect(summarizeNormalization([], [])).toBe(
      "0 candidates (0 named rivers from 0 segments); 0 discarded",
    );
  });
});

describe("summarizeLocation", () => {
  it("counts sites, named river sites and those without municipality", () => {
    const located = (slug: string, name: string | null, municipalityId: number | null) => ({
      ...candidate(slug, name, 1),
      point: null,
      municipalityId,
    });
    expect(
      summarizeLocation([
        located("rio", "Río Cauca", 1),
        located("rio", "Río Cauca", 2),
        located("rio", "Río Cauca", null),
        located("cascada", "La Chorrera", 3),
      ]),
    ).toBe("4 sites after municipality assignment (2 named river sites; 1 without municipality)");
  });
});
