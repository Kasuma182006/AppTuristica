import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "@db/seeds/activities";
import { PLACE_TYPES } from "@db/seeds/place-types";
import type { Catalog } from "../../catalog";
import {
  altitudeFromEle,
  costFromFee,
  difficultyFromSacScale,
  nameFromTags,
  normalizeOsmElement,
  wikidataIdFromTags,
} from "./normalize";
import type { OsmElement } from "./overpass";

// The seeded rules, as loadCatalog reads them from the database.
const seedCatalog: Catalog = {
  placeTypes: PLACE_TYPES.map((t) => ({ slug: t.slug, osmTags: [...t.osmTags] })),
  activityRules: ACTIVITIES.map((a) => ({
    slug: a.slug,
    placeTypes: [...a.placeTypes],
    osmTags: [...a.osmTags],
  })),
  municipalities: new Map(),
};

function element(tags: Record<string, string>, overrides: Partial<OsmElement> = {}): OsmElement {
  return { type: "node", id: 1, tags, point: { lat: 3.4, lon: -76.6 }, ...overrides };
}

describe("nameFromTags", () => {
  it("prefers name:es over name", () => {
    expect(nameFromTags({ name: "Pance", "name:es": "Río Pance" })).toBe("Río Pance");
    expect(nameFromTags({ name: "Cascada La Chorrera" })).toBe("Cascada La Chorrera");
  });

  it("collapses whitespace and treats blank names as missing", () => {
    expect(nameFromTags({ name: "  Mirador   de  Dapa " })).toBe("Mirador de Dapa");
    expect(nameFromTags({ "name:es": " ", name: "Farallones" })).toBe("Farallones");
    expect(nameFromTags({ name: "  " })).toBeNull();
    expect(nameFromTags({})).toBeNull();
  });
});

describe("difficultyFromSacScale", () => {
  it.each([
    ["hiking", "easy"],
    ["mountain_hiking", "moderate"],
    ["demanding_mountain_hiking", "moderate"],
    ["alpine_hiking", "hard"],
    ["demanding_alpine_hiking", "hard"],
    ["difficult_alpine_hiking", "hard"],
    ["T1", "easy"],
    ["T3", "moderate"],
    ["t6", "hard"],
  ])("maps %s to %s", (value, difficulty) => {
    expect(difficultyFromSacScale(value)).toBe(difficulty);
  });

  it("returns null for missing or unknown values", () => {
    expect(difficultyFromSacScale(undefined)).toBeNull();
    expect(difficultyFromSacScale("strolling")).toBeNull();
  });
});

describe("costFromFee", () => {
  it("maps no to free and yes or a price to paid", () => {
    expect(costFromFee("no")).toBe("free");
    expect(costFromFee("yes")).toBe("paid");
    expect(costFromFee(" Yes ")).toBe("paid");
    expect(costFromFee("5000 COP")).toBe("paid");
    expect(costFromFee("COP 5.000")).toBe("paid");
  });

  it("treats a zero price as free", () => {
    expect(costFromFee("0 COP")).toBe("free");
  });

  it("returns null for missing or unclear values", () => {
    expect(costFromFee(undefined)).toBeNull();
    expect(costFromFee("")).toBeNull();
    expect(costFromFee("donation")).toBeNull();
  });
});

describe("altitudeFromEle", () => {
  it.each([
    ["1550", 1550],
    ["1550.4", 1550],
    ["1550,6", 1551],
    ["1550 m", 1550],
    ["1550m", 1550],
    ["1.550", 1550],
    ["4,080", 4080],
    ["5000 ft", 1524],
    ["-3", -3],
  ])("reads %s as %i m", (value, meters) => {
    expect(altitudeFromEle(value)).toBe(meters);
  });

  it("returns null for missing, unclear or out-of-range values", () => {
    expect(altitudeFromEle(undefined)).toBeNull();
    expect(altitudeFromEle("alto")).toBeNull();
    expect(altitudeFromEle("1550-1600")).toBeNull();
    expect(altitudeFromEle("12000")).toBeNull();
    expect(altitudeFromEle("-600")).toBeNull();
  });
});

describe("normalizeOsmElement", () => {
  it("builds a candidate with every available field", () => {
    expect(
      normalizeOsmElement(
        element(
          {
            highway: "path",
            sac_scale: "mountain_hiking",
            name: "Sendero Los Monos",
            ele: "2100",
            fee: "no",
          },
          { type: "way", id: 77 },
        ),
        seedCatalog,
      ),
    ).toEqual({
      name: "Sendero Los Monos",
      placeTypeSlug: "sendero",
      difficulty: "moderate",
      altitudeM: 2100,
      cost: "free",
      activitySlugs: ["senderismo"],
      wikidataId: null,
      elements: [
        {
          externalId: "way/77",
          point: { lat: 3.4, lon: -76.6 },
          tags: {
            highway: "path",
            sac_scale: "mountain_hiking",
            name: "Sendero Los Monos",
            ele: "2100",
            fee: "no",
          },
        },
      ],
    });
  });

  it("classifies by type priority and derives activities from type and tags", () => {
    const peakViewpoint = normalizeOsmElement(
      element({ natural: "peak", tourism: "viewpoint", name: "Pico de Loro" }),
      seedCatalog,
    );
    expect(peakViewpoint.placeTypeSlug).toBe("mirador");
    expect(peakViewpoint.activitySlugs).toEqual(["fotografia"]);

    const reserve = normalizeOsmElement(element({ leisure: "nature_reserve" }), seedCatalog);
    expect(reserve.activitySlugs).toEqual(["senderismo", "avistamiento-de-aves"]);
  });

  it("leaves missing data as null", () => {
    const candidate = normalizeOsmElement(
      element({ natural: "waterfall" }, { type: "relation", id: 5, point: null }),
      seedCatalog,
    );
    expect(candidate).toMatchObject({
      name: null,
      placeTypeSlug: "cascada",
      difficulty: null,
      altitudeM: null,
      cost: null,
    });
    expect(candidate.elements[0]).toMatchObject({ externalId: "relation/5", point: null });
  });

  it("gives no type nor activities when no type matches", () => {
    const candidate = normalizeOsmElement(
      element({ amenity: "bench", sac_scale: "hiking" }),
      seedCatalog,
    );
    expect(candidate.placeTypeSlug).toBeNull();
    expect(candidate.activitySlugs).toEqual([]);
  });
});

describe("wikidataIdFromTags", () => {
  it("reads a valid item id", () => {
    expect(wikidataIdFromTags({ wikidata: "Q3216251" })).toBe("Q3216251");
    expect(wikidataIdFromTags({ wikidata: " q853332 " })).toBe("Q853332");
  });

  it("ignores missing or malformed values", () => {
    expect(wikidataIdFromTags({})).toBeNull();
    expect(wikidataIdFromTags({ wikidata: "Q1;Q2" })).toBeNull();
    expect(wikidataIdFromTags({ wikidata: "Laguna de Sonso" })).toBeNull();
  });
});
