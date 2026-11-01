import { describe, expect, it } from "vitest";
import { placeFacts } from "./place-facts";

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
