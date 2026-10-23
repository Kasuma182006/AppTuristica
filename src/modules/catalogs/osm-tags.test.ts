import { describe, expect, it } from "vitest";
import {
  classifyByOsmTags,
  matchesAnySelector,
  matchesSelector,
  osmTagSelectorsSchema,
  type OsmTagSelector,
} from "./osm-tags";

describe("matchesSelector", () => {
  it("matches an exact tag", () => {
    expect(matchesSelector({ natural: "waterfall", name: "Salto" }, { natural: "waterfall" })).toBe(
      true,
    );
  });

  it("rejects a different value or a missing key", () => {
    expect(matchesSelector({ natural: "peak" }, { natural: "waterfall" })).toBe(false);
    expect(matchesSelector({ name: "Salto" }, { natural: "waterfall" })).toBe(false);
  });

  it("requires every tag of the selector", () => {
    const selector = { highway: "path", sac_scale: "*" };
    expect(matchesSelector({ highway: "path", sac_scale: "hiking" }, selector)).toBe(true);
    expect(matchesSelector({ highway: "path" }, selector)).toBe(false);
    expect(matchesSelector({ highway: "footway", sac_scale: "hiking" }, selector)).toBe(false);
  });

  it('treats "*" as any value of a present key', () => {
    expect(matchesSelector({ sac_scale: "mountain_hiking" }, { sac_scale: "*" })).toBe(true);
    expect(matchesSelector({}, { sac_scale: "*" })).toBe(false);
  });
});

describe("matchesAnySelector", () => {
  const selectors: OsmTagSelector[] = [{ natural: "waterfall" }, { waterway: "waterfall" }];

  it("matches when any selector matches", () => {
    expect(matchesAnySelector({ waterway: "waterfall" }, selectors)).toBe(true);
  });

  it("does not match when none does", () => {
    expect(matchesAnySelector({ waterway: "river" }, selectors)).toBe(false);
  });
});

describe("classifyByOsmTags", () => {
  const types = [
    { slug: "mirador", osmTags: [{ tourism: "viewpoint" }] },
    { slug: "cerro", osmTags: [{ natural: "peak" }] },
  ];

  it("returns the matching type", () => {
    expect(classifyByOsmTags({ natural: "peak" }, types)?.slug).toBe("cerro");
  });

  it("prefers the first type when several match", () => {
    expect(classifyByOsmTags({ natural: "peak", tourism: "viewpoint" }, types)?.slug).toBe(
      "mirador",
    );
  });

  it("returns undefined when nothing matches", () => {
    expect(classifyByOsmTags({ amenity: "cafe" }, types)).toBeUndefined();
  });
});

describe("osmTagSelectorsSchema", () => {
  it("accepts a list of selectors", () => {
    expect(osmTagSelectorsSchema.safeParse([{ natural: "water", water: "lake" }]).success).toBe(
      true,
    );
  });

  it.each([
    ["an empty list", []],
    ["an empty selector", [{}]],
    ["an empty value", [{ natural: "" }]],
    ["an uppercase key", [{ Natural: "peak" }]],
  ])("rejects %s", (_label, value) => {
    expect(osmTagSelectorsSchema.safeParse(value).success).toBe(false);
  });
});
