import { describe, expect, it } from "vitest";
import { applyRestrictions, representativeElement } from "./restrictions";
import type { ValidSite } from "./types";

const a = { lat: 3.0, lon: -76.5 };
const b = { lat: 3.1, lon: -76.5 };

function site(overrides: Partial<ValidSite> = {}): ValidSite {
  return {
    name: "Río Pance",
    placeTypeSlug: "rio",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    wikidataId: null,
    elements: [
      { externalId: "way/1", point: a, tags: { waterway: "river" } },
      { externalId: "way/2", point: b, tags: { waterway: "river", access: "private" } },
    ],
    point: a,
    municipalityId: 7,
    ...overrides,
  };
}

const neverProtected = () => false;
const reserveTags = (tags: Record<string, string>) => tags.leisure === "nature_reserve";

describe("representativeElement", () => {
  it("is the element whose point is the site's point", () => {
    expect(representativeElement(site({ point: b })).externalId).toBe("way/2");
  });

  it("falls back to the first element", () => {
    expect(representativeElement(site({ point: { lat: 9, lon: 9 } })).externalId).toBe("way/1");
  });
});

describe("applyRestrictions", () => {
  it("leaves a site outside protected areas normal", () => {
    expect(applyRestrictions(site(), false, neverProtected)).toMatchObject({
      inProtectedArea: false,
      privateProperty: false,
      sensitivity: "normal",
    });
  });

  it("makes a site inside a protected area fragile", () => {
    expect(applyRestrictions(site(), true, neverProtected)).toMatchObject({
      inProtectedArea: true,
      sensitivity: "fragile",
    });
  });

  it("makes a site that is itself a protected area fragile", () => {
    const reserve = site({
      placeTypeSlug: "reserva-natural",
      elements: [{ externalId: "way/9", point: a, tags: { leisure: "nature_reserve" } }],
    });
    expect(applyRestrictions(reserve, false, reserveTags)).toMatchObject({
      inProtectedArea: true,
      sensitivity: "fragile",
    });
  });

  it("marks private property from the representative element only", () => {
    expect(applyRestrictions(site({ point: b }), false, neverProtected).privateProperty).toBe(true);
    expect(applyRestrictions(site({ point: a }), false, neverProtected).privateProperty).toBe(
      false,
    );
  });

  it("does not treat other access values as private", () => {
    const permissive = site({
      elements: [{ externalId: "node/1", point: a, tags: { access: "permissive" } }],
    });
    expect(applyRestrictions(permissive, false, neverProtected).privateProperty).toBe(false);
  });
});
