import { describe, expect, it } from "vitest";
import { anyActive, withActive } from "./filter-panel-state";

describe("withActive", () => {
  it("records a filter's state", () => {
    expect(withActive({}, "tipo", true)).toEqual({ tipo: true });
    expect(withActive({ tipo: true }, "tipo", false)).toEqual({ tipo: false });
  });

  it("returns the same object when nothing changes, so React does not re-render", () => {
    const state = { tipo: true };
    expect(withActive(state, "tipo", true)).toBe(state);
    const empty = {};
    expect(withActive(empty, "lugar", false)).toBe(empty);
  });
});

describe("anyActive", () => {
  it("is true when at least one filter is active", () => {
    expect(anyActive({ lugar: false, tipo: true })).toBe(true);
  });

  it("is false when none is", () => {
    expect(anyActive({})).toBe(false);
    expect(anyActive({ lugar: false, origen: false })).toBe(false);
  });
});
