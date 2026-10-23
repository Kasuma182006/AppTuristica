import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "@/lib/slug";
import { classifyByOsmTags, osmTagSelectorsSchema } from "@/modules/catalogs/osm-tags";
import { PLACE_TYPES } from "./place-types";

describe("place type seed configuration", () => {
  it("has the MVP types in order", () => {
    expect(PLACE_TYPES.map((t) => t.name)).toEqual([
      "Cascada",
      "Río",
      "Mirador",
      "Cerro o pico",
      "Sendero",
      "Lago o laguna",
      "Reserva natural",
      "Balneario",
      "Playa",
    ]);
  });

  it("has unique, valid slugs and names", () => {
    const slugs = PLACE_TYPES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(PLACE_TYPES.map((t) => t.name)).size).toBe(PLACE_TYPES.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
  });

  it.each(PLACE_TYPES.map((t) => [t.slug, t] as const))(
    "has valid OSM tag selectors for %s",
    (_slug, placeType) => {
      expect(osmTagSelectorsSchema.safeParse(placeType.osmTags).success).toBe(true);
    },
  );

  it("does not repeat a selector across types", () => {
    const keys = PLACE_TYPES.flatMap((t) => t.osmTags.map((s) => JSON.stringify(s)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each([
    [{ natural: "waterfall", name: "Salto de Bordones" }, "cascada"],
    [{ waterway: "river", name: "Río Pance" }, "rio"],
    [{ tourism: "viewpoint" }, "mirador"],
    [{ natural: "peak", ele: "4080" }, "cerro"],
    [{ route: "hiking" }, "sendero"],
    [{ highway: "path", sac_scale: "mountain_hiking" }, "sendero"],
    [{ natural: "water", water: "reservoir", name: "Lago Calima" }, "lago"],
    [{ boundary: "protected_area", protect_class: "2" }, "reserva-natural"],
    [{ leisure: "swimming_area" }, "balneario"],
    [{ natural: "beach", name: "Playa de Ladrilleros" }, "playa"],
    // A beach also tagged as a swimming area: balneario comes first in priority.
    [{ natural: "beach", leisure: "swimming_area" }, "balneario"],
  ])("classifies %j as %s", (tags, slug) => {
    expect(classifyByOsmTags(tags, PLACE_TYPES)?.slug).toBe(slug);
  });

  it.each([
    [{ highway: "path" }],
    [{ natural: "water" }],
    [{ waterway: "stream" }],
    [{ amenity: "restaurant" }],
  ])("leaves %j unclassified", (tags) => {
    expect(classifyByOsmTags(tags, PLACE_TYPES)).toBeUndefined();
  });
});
