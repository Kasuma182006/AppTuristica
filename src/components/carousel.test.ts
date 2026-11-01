import { describe, expect, it } from "vitest";
import { slideAt } from "./carousel";

describe("slideAt", () => {
  it("rounds to the slide that fills most of the view", () => {
    expect(slideAt(0, 375, 5)).toBe(0);
    expect(slideAt(180, 375, 5)).toBe(0);
    expect(slideAt(200, 375, 5)).toBe(1);
    expect(slideAt(750, 375, 5)).toBe(2);
  });

  it("stays within the slides", () => {
    expect(slideAt(-40, 375, 5)).toBe(0);
    expect(slideAt(5000, 375, 5)).toBe(4);
  });

  it("starts at the first slide before the track has a size", () => {
    expect(slideAt(0, 0, 5)).toBe(0);
    expect(slideAt(100, 375, 0)).toBe(0);
  });
});
