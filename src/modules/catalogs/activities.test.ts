import { describe, expect, it } from "vitest";
import { deriveActivities, type ActivityRule } from "./activities";

const rules: ActivityRule[] = [
  { slug: "senderismo", placeTypes: ["sendero", "cerro"], osmTags: [{ sac_scale: "*" }] },
  { slug: "ciclismo", placeTypes: [], osmTags: [{ "mtb:scale": "*" }] },
  { slug: "fotografia", placeTypes: ["mirador"], osmTags: [{ tourism: "viewpoint" }] },
];

describe("deriveActivities", () => {
  it("derives activities from the place type", () => {
    expect(deriveActivities("sendero", {}, rules)).toEqual(["senderismo"]);
  });

  it("derives activities from OSM tags", () => {
    expect(deriveActivities("rio", { sac_scale: "hiking" }, rules)).toEqual(["senderismo"]);
  });

  it("combines type and tag rules, in rule order, without duplicates", () => {
    const tags = { sac_scale: "mountain_hiking", "mtb:scale": "2", tourism: "viewpoint" };
    expect(deriveActivities("cerro", tags, rules)).toEqual([
      "senderismo",
      "ciclismo",
      "fotografia",
    ]);
  });

  it("returns no activities when nothing matches", () => {
    expect(deriveActivities("lago", { name: "Laguna" }, rules)).toEqual([]);
  });
});
