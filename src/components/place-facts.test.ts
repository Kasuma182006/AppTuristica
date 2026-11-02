import { describe, expect, it } from "vitest";
import { coordinatesText, placeFacts } from "./place-facts";

describe("placeFacts", () => {
  it("lists difficulty, altitude and cost in Spanish", () => {
    expect(placeFacts({ difficulty: "moderada", altitudeM: 2170, cost: "gratis" })).toEqual([
      { label: "Dificultad", value: "Moderada" },
      { label: "Altitud", value: "2.170 m s. n. m." },
      { label: "Costo de entrada", value: "Gratis" },
    ]);
  });

  it("leaves out what has no data", () => {
    expect(placeFacts({ difficulty: null, altitudeM: null, cost: null })).toEqual([]);
    expect(placeFacts({ difficulty: null, altitudeM: 1050, cost: "pago" })).toEqual([
      { label: "Altitud", value: "1.050 m s. n. m." },
      { label: "Costo de entrada", value: "Con costo" },
    ]);
  });

  it("keeps an altitude of 0 m", () => {
    expect(placeFacts({ difficulty: "facil", altitudeM: 0, cost: null })).toEqual([
      { label: "Dificultad", value: "Fácil" },
      { label: "Altitud", value: "0 m s. n. m." },
    ]);
  });
});

describe("coordinatesText", () => {
  it("gives exact sites' coordinates with 5 decimals", () => {
    expect(
      coordinatesText({ lat: 3.449231, lng: -76.545228, approximate: false, radiusM: null }),
    ).toBe("3.44923, -76.54523");
    expect(coordinatesText({ lat: 4, lng: -76.1, approximate: false, radiusM: null })).toBe(
      "4.00000, -76.10000",
    );
  });

  it("never gives coordinates for fragile sites", () => {
    expect(
      coordinatesText({ lat: 3.45, lng: -76.61, approximate: true, radiusM: 2000 }),
    ).toBeNull();
  });
});
