import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "@/lib/slug";
import { DEPARTMENTS } from "./departments";
import {
  departmentCodeOf,
  loadMunicipalityBoundaries,
  MUNICIPALITIES,
  municipalitiesOf,
  slugOf,
} from "./municipalities";

describe("municipality seed configuration", () => {
  it("has the 42 municipalities of Valle del Cauca", () => {
    expect(municipalitiesOf("76")).toHaveLength(42);
  });

  it("uses five-digit DIVIPOLA codes of a configured department", () => {
    const departmentCodes = new Set(DEPARTMENTS.map((d) => d.code));
    for (const { code } of MUNICIPALITIES) {
      expect(code).toMatch(/^[0-9]{5}$/);
      expect(departmentCodes).toContain(departmentCodeOf(code));
    }
  });

  it("has unique codes, OSM relations and slugs", () => {
    const unique = (values: unknown[]) => new Set(values).size === values.length;
    expect(unique(MUNICIPALITIES.map((m) => m.code))).toBe(true);
    expect(unique(MUNICIPALITIES.map((m) => m.osmRelationId))).toBe(true);
    expect(unique(MUNICIPALITIES.map(slugOf))).toBe(true);
  });

  it("produces valid slugs", () => {
    for (const municipality of MUNICIPALITIES) expect(slugOf(municipality)).toMatch(SLUG_PATTERN);
  });

  it.each([
    ["76001", "cali"],
    ["76111", "buga"],
    ["76243", "el-aguila"],
    ["76364", "jamundi"],
    ["76400", "la-union"],
  ])("gives %s the slug %s", (code, slug) => {
    const municipality = MUNICIPALITIES.find((m) => m.code === code);
    expect(municipality && slugOf(municipality)).toBe(slug);
  });

  it("lets an explicit slug override the generated one", () => {
    expect(
      slugOf({ code: "05055", name: "Argelia", osmRelationId: 1, slug: "argelia-antioquia" }),
    ).toBe("argelia-antioquia");
  });

  it.each(DEPARTMENTS.map((d) => [d.code] as const))(
    "has committed boundaries matching the configuration for %s",
    async (code) => {
      const collection = await loadMunicipalityBoundaries(code);
      expect(collection.features.map((f) => f.properties.code).sort()).toEqual(
        municipalitiesOf(code)
          .map((m) => m.code)
          .sort(),
      );
    },
  );
});
