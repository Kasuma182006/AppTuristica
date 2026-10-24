import { describe, expect, it } from "vitest";
import { mostCentralPoint, splitByMunicipality } from "./municipality";
import type { CandidatePlace, Point } from "./types";

function river(points: (Point | null)[]): CandidatePlace {
  return {
    name: "Río Cauca",
    placeTypeSlug: "rio",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    elements: points.map((point, i) => ({ externalId: `way/${i + 1}`, point, tags: {} })),
  };
}

describe("mostCentralPoint", () => {
  it("picks the point closest to the average", () => {
    const points = [
      { lat: 3.0, lon: -76.0 },
      { lat: 3.1, lon: -76.1 },
      { lat: 3.25, lon: -76.25 },
      { lat: 3.4, lon: -76.4 },
    ];
    // Average: 3.1875, -76.1875.
    expect(mostCentralPoint(points)).toEqual({ lat: 3.25, lon: -76.25 });
  });

  it("stays on a curved course instead of returning the average", () => {
    // A U-shaped river: the average (3.05, -76.1) is off the course.
    const points = [
      { lat: 3.0, lon: -76.0 },
      { lat: 3.1, lon: -76.0 },
      { lat: 3.0, lon: -76.2 },
      { lat: 3.1, lon: -76.2 },
    ];
    expect(points).toContainEqual(mostCentralPoint(points));
  });

  it("returns the only point, or null without points", () => {
    expect(mostCentralPoint([{ lat: 1, lon: 2 }])).toEqual({ lat: 1, lon: 2 });
    expect(mostCentralPoint([])).toBeNull();
  });
});

describe("splitByMunicipality", () => {
  const a = { lat: 3.0, lon: -76.5 };
  const b = { lat: 3.1, lon: -76.5 };
  const c = { lat: 3.2, lon: -76.5 };
  const d = { lat: 4.0, lon: -76.0 };

  it("makes one site per municipality, with its own segments and central point", () => {
    const sites = splitByMunicipality(
      river([a, b, c, d]),
      new Map([
        ["way/1", 10],
        ["way/2", 10],
        ["way/3", 10],
        ["way/4", 20],
      ]),
    );
    expect(sites).toHaveLength(2);
    expect(sites[0]).toMatchObject({ name: "Río Cauca", municipalityId: 10, point: b });
    expect(sites[0]?.elements.map((e) => e.externalId)).toEqual(["way/1", "way/2", "way/3"]);
    expect(sites[1]).toMatchObject({ municipalityId: 20, point: d });
  });

  it("keeps a single-element candidate whole", () => {
    expect(splitByMunicipality(river([a]), new Map([["way/1", 10]]))).toEqual([
      { ...river([a]), point: a, municipalityId: 10 },
    ]);
  });

  it("groups elements outside every municipality or without a point into a site with no municipality", () => {
    const sites = splitByMunicipality(
      river([a, b, null]),
      new Map<string, number | null>([
        ["way/1", 10],
        ["way/2", null],
      ]),
    );
    expect(sites.map((s) => [s.municipalityId, s.elements.map((e) => e.externalId)])).toEqual([
      [10, ["way/1"]],
      [null, ["way/2", "way/3"]],
    ]);
    expect(sites[1]?.point).toEqual(b);
  });

  it("gives no point when no element has one", () => {
    const [site] = splitByMunicipality(river([null]), new Map());
    expect(site).toMatchObject({ point: null, municipalityId: null });
  });
});
