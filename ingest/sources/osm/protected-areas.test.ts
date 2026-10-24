import { describe, expect, it } from "vitest";
import { buildProtectedAreasQuery, isProtectedArea, parseProtectedAreas } from "./protected-areas";

const square = (lon: number, lat: number) => [
  { lat, lon },
  { lat, lon: lon + 0.1 },
  { lat: lat + 0.1, lon: lon + 0.1 },
  { lat, lon },
];

describe("isProtectedArea", () => {
  it.each([
    [{ boundary: "protected_area", protection_title: "Parque Natural Regional" }],
    [{ leisure: "nature_reserve" }],
    [{ boundary: "national_park", name: "Parque Nacional Natural Farallones de Cali" }],
    [{ boundary: "protected_area", protection_title: "Reserva Natural de la Sociedad Civil" }],
  ])("accepts %j", (tags) => {
    expect(isProtectedArea(tags)).toBe(true);
  });

  it("excludes urban ecoparks, by title or name", () => {
    expect(isProtectedArea({ boundary: "protected_area", protection_title: "Ecoparque" })).toBe(
      false,
    );
    expect(isProtectedArea({ boundary: "protected_area", name: "Ecoparque Cristo Rey" })).toBe(
      false,
    );
  });

  it("rejects other elements", () => {
    expect(isProtectedArea({ natural: "waterfall" })).toBe(false);
    expect(isProtectedArea({ boundary: "administrative" })).toBe(false);
  });
});

describe("buildProtectedAreasQuery", () => {
  it("asks for every kind of protected area with its geometry", () => {
    const query = buildProtectedAreasQuery([3601322825], 300);
    expect(query).toContain('nwr["boundary"="protected_area"](area.scope);');
    expect(query).toContain('nwr["leisure"="nature_reserve"](area.scope);');
    expect(query).toContain('nwr["boundary"="national_park"](area.scope);');
    expect(query).toMatch(/out geom;$/);
  });
});

describe("parseProtectedAreas", () => {
  it("returns the lines of ways and of relation member ways, in [lon, lat] order", () => {
    const areas = parseProtectedAreas({
      elements: [
        {
          type: "way",
          id: 1,
          tags: { leisure: "nature_reserve", name: "La Mina" },
          geometry: square(-76, 3),
        },
        {
          type: "relation",
          id: 2,
          tags: { boundary: "national_park", name: "Farallones" },
          members: [
            { type: "way", geometry: square(-76.6, 3.2) },
            { type: "node" },
            { type: "way", geometry: square(-76.55, 3.25) },
          ],
        },
      ],
    });
    expect(areas.map((a) => [a.externalId, a.name, a.lines.length])).toEqual([
      ["way/1", "La Mina", 1],
      ["relation/2", "Farallones", 2],
    ]);
    expect(areas[0]?.lines[0]?.[0]).toEqual([-76, 3]);
  });

  it("skips point reserves, ecoparks and elements without usable lines", () => {
    expect(
      parseProtectedAreas({
        elements: [
          { type: "node", id: 1, tags: { leisure: "nature_reserve" } },
          {
            type: "way",
            id: 2,
            tags: { boundary: "protected_area", name: "Ecoparque La Bandera" },
            geometry: square(-76, 3),
          },
          {
            type: "way",
            id: 3,
            tags: { boundary: "protected_area" },
            geometry: [{ lat: 3, lon: -76 }],
          },
          { type: "relation", id: 4, tags: { boundary: "protected_area" }, members: [] },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects incomplete results and malformed bodies", () => {
    expect(() =>
      parseProtectedAreas({ elements: [], remark: "runtime error: Query timed out" }),
    ).toThrow("Overpass query failed");
    expect(() => parseProtectedAreas("<html>")).toThrow();
  });
});
