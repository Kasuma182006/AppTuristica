import { describe, expect, it } from "vitest";
import { pageItems } from "./pagination";

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 1, 1)).toEqual([1]);
    expect(pageItems(3, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows the first, the last and the current page with its neighbors", () => {
    expect(pageItems(10, 23, 1)).toEqual([1, "gap", 9, 10, 11, "gap", 23]);
  });

  it("puts the missing page instead of a gap that would hide only one", () => {
    expect(pageItems(4, 23, 1)).toEqual([1, 2, 3, 4, 5, "gap", 23]);
    expect(pageItems(20, 23, 1)).toEqual([1, "gap", 19, 20, 21, 22, 23]);
  });

  it("stays short at the ends", () => {
    expect(pageItems(1, 23, 1)).toEqual([1, 2, "gap", 23]);
    expect(pageItems(23, 23, 1)).toEqual([1, "gap", 22, 23]);
  });

  it("shows only the current page between the ends on small screens", () => {
    expect(pageItems(10, 23, 0)).toEqual([1, "gap", 10, "gap", 23]);
  });

  it("is empty without results", () => {
    expect(pageItems(1, 0, 1)).toEqual([]);
  });

  it("ignores a current page past the end", () => {
    expect(pageItems(99, 23, 1)).toEqual([1, "gap", 23]);
  });
});
