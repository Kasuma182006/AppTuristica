import { describe, expect, it } from "vitest";
import { similarPlaceNames } from "./place-names";

describe("similarPlaceNames", () => {
  it.each([
    ["Charco del Burro", "Charco del Burro"],
    ["Charco el Burro", "Charco del Burro"],
    ["charco del burro", "CHARCO DEL BURRO"],
    ["Río Cali", "Rio Cali"],
    ["Cauca", "Río Cauca"],
    ["Cascada", "Cascada del Burro"],
    ["Burro, el charco", "Charco del Burro"],
  ])("takes %j and %j as possibly the same", (a, b) => {
    expect(similarPlaceNames(a, b)).toBe(true);
    expect(similarPlaceNames(b, a)).toBe(true);
  });

  it.each([
    ["Cascada del Burro", "Charco del Burro"],
    ["Mirador Las Brisas", "Cerro Las Brisas"],
    ["Río Cali", "Río Cauca"],
    // Whole words only.
    ["Cali", "Calima"],
  ])("takes %j and %j as different", (a, b) => {
    expect(similarPlaceNames(a, b)).toBe(false);
  });

  it("does not match names with no significant words", () => {
    expect(similarPlaceNames("La", "La Cascada")).toBe(false);
    expect(similarPlaceNames("", "Cascada")).toBe(false);
    expect(similarPlaceNames("---", "---")).toBe(false);
  });
});
