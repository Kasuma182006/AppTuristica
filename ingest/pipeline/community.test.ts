import { describe, expect, it } from "vitest";
import { discardCommunityDuplicates, type CommunitySite } from "./community";
import type { ValidSite } from "./types";

const point = { lat: 3.4, lon: -76.6 };
// ~1.1 m per 0.00001° of latitude.
const north = (meters: number) => ({ lat: point.lat + meters / 111_195, lon: point.lon });

function site(externalId: string, overrides: Partial<ValidSite> = {}): ValidSite {
  return {
    name: "Cascada La Chorrera",
    placeTypeSlug: "cascada",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    wikidataId: null,
    elements: [{ externalId, point, tags: {} }],
    point,
    municipalityId: 7,
    ...overrides,
  };
}

const community: CommunitySite = {
  name: "La Chorrera",
  placeTypeSlug: "cascada",
  point: north(120),
};

describe("discardCommunityDuplicates", () => {
  it("discards a site of the same type, with a similar name, closer than 200 m", () => {
    const { kept, discarded } = discardCommunityDuplicates([site("node/1")], [community]);
    expect(kept).toEqual([]);
    expect(discarded).toEqual([
      { externalIds: ["node/1"], name: "Cascada La Chorrera", reason: "community-duplicate" },
    ]);
  });

  it("keeps sites that are far, of another type or with another name", () => {
    const sites = [
      site("node/1", { point: north(400) }),
      site("node/2", { placeTypeSlug: "mirador" }),
      site("node/3", { name: "Charco Azul" }),
    ];
    expect(discardCommunityDuplicates(sites, [community]).kept).toEqual(sites);
  });

  it("keeps every site when there are no community sites", () => {
    expect(discardCommunityDuplicates([site("node/1")], []).kept).toHaveLength(1);
  });
});
