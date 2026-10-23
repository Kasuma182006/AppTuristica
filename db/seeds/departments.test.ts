import { describe, expect, it } from "vitest";
import { DEPARTMENTS, findDepartment, loadBoundaryFile } from "./departments";

describe("department seed configuration", () => {
  it("includes Valle del Cauca (MVP scope)", () => {
    expect(findDepartment("76")).toEqual({
      code: "76",
      name: "Valle del Cauca",
      osmRelationId: 1322825,
    });
  });

  it("has unique two-digit DIVIPOLA codes", () => {
    const codes = DEPARTMENTS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[0-9]{2}$/);
  });

  it("rejects unknown codes", () => {
    expect(() => findDepartment("99")).toThrow(/Unknown department code "99"/);
  });

  it.each(DEPARTMENTS.map((d) => [d.code, d] as const))(
    "has a valid committed boundary file for %s",
    async (_code, department) => {
      const file = await loadBoundaryFile(department);
      expect(file.properties.code).toBe(department.code);
      expect(file.geometry.coordinates.length).toBeGreaterThan(0);
    },
  );

  it("keeps the Valle boundary at full resolution", async () => {
    const file = await loadBoundaryFile(findDepartment("76"));
    const positions = file.geometry.coordinates.flat(2).length;
    expect(positions).toBeGreaterThan(20_000);
  });
});
