import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "@/lib/slug";
import { deriveActivities } from "@/modules/catalogs/activities";
import { classifyByOsmTags } from "@/modules/catalogs/osm-tags";
import { ACTIVITIES } from "./activities";
import { PLACE_TYPES } from "./place-types";

const typeSlugs = PLACE_TYPES.map((t) => t.slug);

/** What ingest will do: classify the OSM element, then derive its activities. */
function activitiesFor(tags: Record<string, string>): string[] {
  const type = classifyByOsmTags(tags, PLACE_TYPES);
  return type ? deriveActivities(type.slug, tags, ACTIVITIES) : [];
}

describe("activity seed configuration", () => {
  it("has the MVP activities in order", () => {
    expect(ACTIVITIES.map((a) => a.name)).toEqual([
      "Senderismo",
      "Baño en río",
      "Avistamiento de aves",
      "Camping",
      "Ciclismo",
      "Fotografía",
      "Plan familiar",
    ]);
  });

  it("has unique, valid slugs and names", () => {
    const slugs = ACTIVITIES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ACTIVITIES.map((a) => a.name)).size).toBe(ACTIVITIES.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
  });

  it.each(ACTIVITIES.map((a) => [a.slug, a] as const))(
    "references only existing place types in %s",
    (_slug, activity) => {
      for (const type of activity.placeTypes) expect(typeSlugs).toContain(type);
    },
  );

  it("gives every activity at least one rule", () => {
    for (const activity of ACTIVITIES) {
      expect(activity.placeTypes.length + activity.osmTags.length).toBeGreaterThan(0);
    }
  });

  it.each([
    [{ highway: "path", sac_scale: "hiking", name: "Sendero La Teta" }, ["senderismo"]],
    [
      { highway: "path", sac_scale: "mountain_hiking", "mtb:scale": "2" },
      ["senderismo", "ciclismo"],
    ],
    [{ natural: "peak", tourism: "viewpoint" }, ["fotografia"]],
    [{ natural: "peak" }, ["senderismo"]],
    [{ waterway: "waterfall" }, ["fotografia"]],
    [{ waterway: "river" }, []],
    [
      { leisure: "nature_reserve", tourism: "camp_site" },
      ["senderismo", "avistamiento-de-aves", "camping"],
    ],
    [{ leisure: "swimming_area" }, ["bano-en-rio", "plan-familiar"]],
    [{ natural: "beach" }, ["plan-familiar"]],
  ])("derives activities of %j", (tags, expected) => {
    expect(activitiesFor(tags)).toEqual(expected);
  });
});
