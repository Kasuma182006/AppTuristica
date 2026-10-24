import { describe, expect, it } from "vitest";
import { deduplicate, distanceM, formatMerge, similarNames } from "./dedup";
import type { Point, RestrictedSite } from "./types";

const ORDER = ["senderismo", "bano-en-rio", "avistamiento-de-aves", "fotografia"];
const base: Point = { lat: 3.4, lon: -76.6 };
/** A point `meters` north of `base` (1° of latitude ≈ 111,195 m). */
const north = (meters: number): Point => ({ lat: base.lat + meters / 111_195, lon: base.lon });

function site(externalId: string, overrides: Partial<RestrictedSite> = {}): RestrictedSite {
  const point = overrides.point ?? base;
  return {
    name: "Mirador",
    placeTypeSlug: "mirador",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    wikidataId: null,
    elements: [{ externalId, point, tags: {} }],
    point,
    municipalityId: 1,
    inProtectedArea: false,
    privateProperty: false,
    sensitivity: "normal",
    ...overrides,
  };
}

const noAreas = (sites: readonly RestrictedSite[]) => ({
  activityOrder: ORDER,
  containingAreas: sites.map(() => []),
});

describe("distanceM", () => {
  it("measures meters between points", () => {
    expect(distanceM(base, north(150))).toBeCloseTo(150, 0);
  });
});

describe("similarNames", () => {
  it.each([
    ["Mirador", "mirador"],
    ["Laguna de Sonso o del Chircal", "DRMI Laguna de Sonso o del Chircal"],
    ["Parque Nacional Natural Farallones", "Parque Nacional Natural Farallones de Cali"],
    ["Río Lindo", "Rio Lindo"],
  ])("%s ~ %s", (a, b) => {
    expect(similarNames(a, b)).toBe(true);
  });

  it.each([
    ["Cascada 1", "Cascada 2"],
    ["Cascada 1", "Cascada 12"],
    ["Primer Pailón", "Segundo Pailón"],
    ["Charco", "Charcos del Diablo"],
  ])("%s ≁ %s", (a, b) => {
    expect(similarNames(a, b)).toBe(false);
  });
});

describe("deduplicate", () => {
  it("merges same-type sites with similar names closer than 200 m", () => {
    const sites = [site("node/1"), site("node/2", { point: north(98) })];
    const { sites: result, merges } = deduplicate(sites, noAreas(sites));
    expect(result).toHaveLength(1);
    expect(result[0]?.elements.map((e) => e.externalId)).toEqual(["node/1", "node/2"]);
    expect(merges.map((m) => m.mergedExternalIds)).toEqual([["node/2"]]);
  });

  it("keeps sites apart when far, of another type, or with different names", () => {
    const sites = [
      site("node/1"),
      site("node/2", { point: north(250) }),
      site("node/3", { placeTypeSlug: "cerro", point: north(10) }),
      site("node/4", { name: "Mirador La Mona", point: north(20) }),
    ];
    // node/4 contains "Mirador" as a word, so it merges with node/1; the others stay.
    const { sites: result } = deduplicate(sites, noAreas(sites));
    expect(result.map((s) => s.elements.map((e) => e.externalId))).toEqual([
      ["node/1", "node/4"],
      ["node/2"],
      ["node/3"],
    ]);
  });

  it("chains duplicates into one site", () => {
    const sites = [
      site("node/1"),
      site("node/2", { point: north(150) }),
      site("node/3", { point: north(300) }),
    ];
    expect(deduplicate(sites, noAreas(sites)).sites).toHaveLength(1);
  });

  it("keeps the site with more data, then a node, then the lowest id", () => {
    const rich = site("way/9", { name: "Laguna de Sonso o del Chircal", altitudeM: 935 });
    const poor = site("node/5", { name: "DRMI Laguna de Sonso o del Chircal", point: north(13) });
    expect(deduplicate([poor, rich], noAreas([poor, rich])).sites[0]?.name).toBe(
      "Laguna de Sonso o del Chircal",
    );

    const way = site("way/1");
    const node = site("node/7", { point: north(5) });
    expect(deduplicate([way, node], noAreas([way, node])).sites[0]?.elements[0]?.externalId).toBe(
      "node/7",
    );

    const a = site("node/30");
    const b = site("node/4", { point: north(5) });
    expect(deduplicate([a, b], noAreas([a, b])).sites[0]?.elements[0]?.externalId).toBe("node/4");
  });

  it("adds up activities, fills missing fields and keeps restrictions", () => {
    const a = site("node/1", { activitySlugs: ["fotografia"], difficulty: "easy" });
    const b = site("node/2", {
      point: north(50),
      activitySlugs: ["senderismo", "fotografia"],
      altitudeM: 1800,
      inProtectedArea: true,
      sensitivity: "fragile",
      privateProperty: true,
    });
    const [merged] = deduplicate([a, b], noAreas([a, b])).sites;
    expect(merged).toMatchObject({
      difficulty: "easy",
      altitudeM: 1800,
      activitySlugs: ["senderismo", "fotografia"],
      inProtectedArea: true,
      sensitivity: "fragile",
      privateProperty: true,
    });
  });

  it("merges protected areas with similar names when one's point is inside the other", () => {
    const node = site("node/703512687", {
      name: "Parque Nacional Natural Farallones",
      placeTypeSlug: "reserva-natural",
    });
    const relation = site("relation/912599", {
      name: "Parque Nacional Natural Farallones de Cali",
      placeTypeSlug: "reserva-natural",
      point: north(10_000),
    });
    const { sites, merges } = deduplicate([node, relation], {
      activityOrder: ORDER,
      // The node's point lies inside the relation's polygon.
      containingAreas: [["relation/912599"], []],
    });
    expect(sites).toHaveLength(1);
    expect(sites[0]?.name).toBe("Parque Nacional Natural Farallones");
    expect(formatMerge(merges[0]!)).toBe(
      "Parque Nacional Natural Farallones [node/703512687] ← relation/912599",
    );
  });

  it("does not use the polygon rule for other types", () => {
    const a = site("node/1", { name: "Río Pance", placeTypeSlug: "rio" });
    const b = site("way/2", { name: "Río Pance", placeTypeSlug: "rio", point: north(5000) });
    const { sites } = deduplicate([a, b], {
      activityOrder: ORDER,
      containingAreas: [["way/2"], []],
    });
    expect(sites).toHaveLength(2);
  });
});
