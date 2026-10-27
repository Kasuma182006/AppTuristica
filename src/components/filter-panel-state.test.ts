import { describe, expect, it } from "vitest";
import { activeCount, withValue } from "./filter-panel-state";

describe("withValue", () => {
  it("records a filter's value", () => {
    expect(withValue({}, "tipo", "cascada")).toEqual({ tipo: "cascada" });
    expect(withValue({ tipo: "cascada" }, "tipo", "")).toEqual({ tipo: "" });
  });

  it("returns the same object when nothing changes, so React does not re-render", () => {
    const state = { tipo: "cascada,rio" };
    expect(withValue(state, "tipo", "cascada,rio")).toBe(state);
    const empty = {};
    expect(withValue(empty, "lugar", "")).toBe(empty);
  });
});

describe("activeCount", () => {
  it("counts the filters with a value", () => {
    expect(activeCount({ lugar: "dagua", tipo: "", origen: "comunidad" })).toBe(2);
  });

  it("is zero when none narrows the search", () => {
    expect(activeCount({})).toBe(0);
    expect(activeCount({ lugar: "", origen: "" })).toBe(0);
  });
});
