import { describe, expect, it } from "vitest";
import type { Discarded, LocatedCandidate } from "./types";
import {
  discardInvalid,
  discardReasonOf,
  formatDiscarded,
  isNonTouristName,
  summarizeDiscarded,
} from "./validate";

function site(overrides: Partial<LocatedCandidate> = {}): LocatedCandidate {
  return {
    name: "Cascada La Chorrera",
    placeTypeSlug: "cascada",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    elements: [{ externalId: "node/1", point: { lat: 3.4, lon: -76.6 }, tags: {} }],
    point: { lat: 3.4, lon: -76.6 },
    municipalityId: 7,
    ...overrides,
  };
}

describe("discardReasonOf", () => {
  it("accepts a site with name, type, point and municipality", () => {
    expect(discardReasonOf(site())).toBeNull();
  });

  it.each([
    ["no-name", { name: null }],
    ["no-type", { placeTypeSlug: null }],
    ["no-point", { point: null, municipalityId: null }],
    ["outside-area", { municipalityId: null }],
  ] as const)("returns %s", (reason, overrides) => {
    expect(discardReasonOf(site(overrides))).toBe(reason);
  });

  it("reports the first missing field when several are missing", () => {
    expect(discardReasonOf(site({ name: null, placeTypeSlug: null, municipalityId: null }))).toBe(
      "no-name",
    );
  });
});

describe("discardInvalid", () => {
  it("splits valid sites from discarded ones, keeping every external id", () => {
    const valid = site();
    const outside = site({
      name: "Camino real Gaitán - Toche",
      municipalityId: null,
      elements: [{ externalId: "relation/7198294", point: { lat: 3.6, lon: -75.9 }, tags: {} }],
    });
    const unnamed = site({
      name: null,
      elements: [
        { externalId: "way/1", point: { lat: 3, lon: -76 }, tags: {} },
        { externalId: "way/2", point: { lat: 3, lon: -76 }, tags: {} },
      ],
    });
    expect(discardInvalid([valid, outside, unnamed])).toEqual({
      valid: [valid],
      discarded: [
        {
          externalIds: ["relation/7198294"],
          name: "Camino real Gaitán - Toche",
          reason: "outside-area",
        },
        { externalIds: ["way/1", "way/2"], name: null, reason: "no-name" },
      ],
    });
  });
});

describe("formatDiscarded", () => {
  it("shows the reason, the name and up to three external ids", () => {
    expect(
      formatDiscarded({ externalIds: ["node/5"], name: "Ladrilleros", reason: "outside-area" }),
    ).toBe("outside-area: Ladrilleros [node/5]");
    expect(
      formatDiscarded({
        externalIds: ["way/1", "way/2", "way/3", "way/4", "way/5"],
        name: null,
        reason: "canal",
      }),
    ).toBe("canal: (sin nombre) [way/1, way/2, way/3 +2]");
  });
});

describe("summarizeDiscarded", () => {
  it("counts by reason, most frequent first", () => {
    const item = (reason: Discarded["reason"]): Discarded => ({
      externalIds: [],
      name: null,
      reason,
    });
    expect(
      summarizeDiscarded([
        item("canal"),
        item("no-name"),
        item("no-name"),
        item("outside-area"),
        item("no-name"),
      ]),
    ).toBe("no-name: 3, canal: 1, outside-area: 1");
    expect(summarizeDiscarded([])).toBe("");
  });
});

describe("isNonTouristName", () => {
  it.each([
    "Piscina de Lixiviados",
    "planta de tratamiento agua manga vieja",
    "Laguna de Oxidación",
    "Relleno Sanitario Colomba",
    "PTAR Cañaveralejo",
  ])("flags %s", (name) => {
    expect(isNonTouristName(name)).toBe(true);
  });

  it.each(["Laguna de Sonso", "Lago Calima", "Charco Azul", "Reserva Tratamientos Verdes"])(
    "keeps %s",
    (name) => {
      expect(isNonTouristName(name)).toBe(false);
    },
  );

  it("discards infrastructure with the not-tourist reason", () => {
    expect(discardReasonOf(site({ name: "Piscina de Lixiviados", placeTypeSlug: "lago" }))).toBe(
      "not-tourist",
    );
  });
});
