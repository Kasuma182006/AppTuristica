import { describe, expect, it } from "vitest";
import { areaIdForRelation, buildOverpassQuery, selectorFilter } from "./query";

describe("areaIdForRelation", () => {
  it("adds Overpass's relation offset", () => {
    expect(areaIdForRelation(1322825)).toBe(3601322825);
  });
});

describe("selectorFilter", () => {
  it("turns each tag into a filter, with * meaning the key is present", () => {
    expect(selectorFilter({ highway: "path", sac_scale: "*" })).toBe(
      '["highway"="path"]["sac_scale"]',
    );
  });

  it("escapes quotes and backslashes in values", () => {
    expect(selectorFilter({ name: 'a"b\\c' })).toBe('["name"="a\\"b\\\\c"]');
  });
});

describe("buildOverpassQuery", () => {
  it("queries nodes, ways and relations inside the areas and returns centers", () => {
    const query = buildOverpassQuery(
      [{ natural: "waterfall" }, { highway: "path", sac_scale: "*" }],
      [3601322825],
      300,
    );
    expect(query).toBe(
      [
        "[out:json][timeout:300];",
        "area(id:3601322825)->.scope;",
        "(",
        '  nwr["natural"="waterfall"](area.scope);',
        '  nwr["highway"="path"]["sac_scale"](area.scope);',
        ");",
        "out tags center;",
      ].join("\n"),
    );
  });

  it("joins several areas and drops repeated selectors", () => {
    const query = buildOverpassQuery(
      [{ natural: "peak" }, { natural: "peak" }],
      [3601322825, 3600000001],
      60,
    );
    expect(query).toContain("area(id:3601322825,3600000001)->.scope;");
    expect(query.match(/nwr/g)).toHaveLength(1);
  });

  it("rejects empty selectors or areas", () => {
    expect(() => buildOverpassQuery([], [1], 60)).toThrow("No OSM tag selectors");
    expect(() => buildOverpassQuery([{ natural: "peak" }], [], 60)).toThrow("No areas");
  });
});

describe("buildOverpassQuery output", () => {
  it("can return full geometries", () => {
    expect(buildOverpassQuery([{ leisure: "nature_reserve" }], [1], 60, "geom")).toMatch(
      /out geom;$/,
    );
  });
});
