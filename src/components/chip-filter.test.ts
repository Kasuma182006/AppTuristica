import { describe, expect, it } from "vitest";
import { joinSelected, toggleValue } from "./chip-filter";

const options = [{ slug: "cascada" }, { slug: "rio" }, { slug: "mirador" }];

describe("toggleValue", () => {
  it("adds an absent value and removes a present one", () => {
    const once = toggleValue(new Set(), "rio");
    expect([...once]).toEqual(["rio"]);
    expect([...toggleValue(once, "rio")]).toEqual([]);
  });

  it("does not change the given set", () => {
    const selected = new Set(["rio"]);
    toggleValue(selected, "cascada");
    expect([...selected]).toEqual(["rio"]);
  });
});

describe("joinSelected", () => {
  it("joins the chosen slugs in display order, whatever the click order", () => {
    expect(joinSelected(options, new Set(["mirador", "cascada"]))).toBe("cascada,mirador");
  });

  it("returns an empty string when nothing is chosen", () => {
    expect(joinSelected(options, new Set())).toBe("");
  });

  it("ignores values that are not options", () => {
    expect(joinSelected(options, new Set(["rio", "volcan"]))).toBe("rio");
  });
});
