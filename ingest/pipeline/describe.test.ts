import { describe, expect, it } from "vitest";
import { describeSite, describeSites } from "./describe";
import type { SiteWithPhotos } from "./types";

const DAGUA = { name: "Dagua", departmentName: "Valle del Cauca" };
const point = { lat: 3.6, lon: -76.7 };

function site(
  placeTypeSlug: string,
  tags: Record<string, string> = {},
  overrides: Partial<SiteWithPhotos> = {},
): SiteWithPhotos {
  return {
    name: "Sitio",
    placeTypeSlug,
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: ["senderismo"],
    wikidataId: null,
    elements: [{ externalId: "node/1", point, tags }],
    point,
    municipalityId: 3,
    inProtectedArea: false,
    privateProperty: false,
    sensitivity: "normal",
    wikidata: null,
    photos: [],
    ...overrides,
  };
}

describe("describeSite", () => {
  it("starts with the kind and the place, without the name or activities", () => {
    const text = describeSite(
      site("cascada", { natural: "waterfall" }, { name: "Charco Azul" }),
      DAGUA,
    );
    expect(text).toBe("Cascada en Dagua, Valle del Cauca.");
    expect(text).not.toContain("Charco Azul");
    expect(text).not.toContain("senderismo");
  });

  it("adds difficulty and altitude when known, with Spanish number format", () => {
    expect(
      describeSite(site("sendero", {}, { difficulty: "moderate", altitudeM: 2100 }), DAGUA),
    ).toBe(
      "Sendero en Dagua, Valle del Cauca, de dificultad moderada. Se encuentra a 2.100 m sobre el nivel del mar.",
    );
  });

  it.each([
    ["cerro", { natural: "peak" }, "Pico"],
    ["cerro", { natural: "volcano" }, "Volcán"],
    ["cerro", { natural: "hill" }, "Cerro"],
    ["lago", { natural: "water", water: "lagoon" }, "Laguna"],
    ["lago", { natural: "water", water: "reservoir" }, "Embalse"],
    ["lago", { landuse: "reservoir" }, "Embalse"],
    ["lago", { natural: "water", water: "lake" }, "Lago"],
    ["reserva-natural", { boundary: "national_park" }, "Parque nacional natural"],
    ["reserva-natural", { leisure: "nature_reserve" }, "Reserva natural"],
    ["rio", { waterway: "river" }, "Tramo del río"],
    ["mirador", {}, "Mirador"],
    ["balneario", {}, "Balneario"],
    ["playa", {}, "Playa"],
    ["nuevo-tipo", {}, "Sitio natural"],
  ])("names a %s with %j as %s", (type, tags, kind) => {
    expect(describeSite(site(type, tags), DAGUA)).toBe(`${kind} en Dagua, Valle del Cauca.`);
  });

  it("warns about protected areas, telling apart sites inside one from reserves", () => {
    expect(describeSite(site("cascada", {}, { inProtectedArea: true }), DAGUA)).toBe(
      "Cascada en Dagua, Valle del Cauca. Está dentro de un área protegida: visite el lugar con respeto y no deje rastro.",
    );
    expect(describeSite(site("reserva-natural", {}, { inProtectedArea: true }), DAGUA)).toBe(
      "Reserva natural en Dagua, Valle del Cauca. Es un área protegida: visite el lugar con respeto y no deje rastro.",
    );
  });

  it("warns about private property and states the cost", () => {
    expect(
      describeSite(site("balneario", {}, { privateProperty: true, cost: "paid" }), DAGUA),
    ).toBe(
      "Balneario en Dagua, Valle del Cauca. Está en propiedad privada: pida permiso antes de entrar. La entrada tiene costo.",
    );
    expect(describeSite(site("playa", {}, { cost: "free" }), DAGUA)).toBe(
      "Playa en Dagua, Valle del Cauca. La entrada es gratuita.",
    );
  });

  it("uses the representative element's tags", () => {
    const merged = site(
      "lago",
      {},
      {
        elements: [
          { externalId: "way/1", point, tags: { natural: "water", water: "lagoon" } },
          { externalId: "way/2", point: { lat: 9, lon: 9 }, tags: { landuse: "reservoir" } },
        ],
      },
    );
    expect(describeSite(merged, DAGUA)).toBe("Laguna en Dagua, Valle del Cauca.");
  });
});

describe("describeSites", () => {
  it("describes every site in its municipality", () => {
    const [described] = describeSites([site("mirador")], new Map([[3, DAGUA]]));
    expect(described?.description).toBe("Mirador en Dagua, Valle del Cauca.");
  });

  it("fails when a municipality is missing from the catalog", () => {
    expect(() => describeSites([site("mirador")], new Map())).toThrow("Municipality 3");
  });
});
