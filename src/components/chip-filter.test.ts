import { describe, expect, it } from "vitest";
import { canUncheck, checkedParam, joinSelected, toggleValue } from "./chip-filter";

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

describe("checkedParam", () => {
  const origins = [{ slug: "abiertas" }, { slug: "comunidad" }];

  it("sends nothing while every option is checked", () => {
    expect(checkedParam(origins, new Set(["comunidad", "abiertas"]))).toBe("");
  });

  it("sends the checked option when the other is unchecked", () => {
    expect(checkedParam(origins, new Set(["comunidad"]))).toBe("comunidad");
  });
});

describe("canUncheck", () => {
  it("allows unchecking while another option stays checked", () => {
    expect(canUncheck(new Set(["abiertas", "comunidad"]), "abiertas")).toBe(true);
  });

  it("keeps the last checked option", () => {
    expect(canUncheck(new Set(["abiertas"]), "abiertas")).toBe(false);
  });

  it("always allows checking an unchecked option", () => {
    expect(canUncheck(new Set(["abiertas"]), "comunidad")).toBe(true);
  });
});
