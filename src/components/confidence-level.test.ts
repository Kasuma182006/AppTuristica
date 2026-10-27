import { describe, expect, it } from "vitest";
import { confidenceLevel } from "./confidence-level";

describe("confidenceLevel", () => {
  it.each([
    [30, "Datos básicos", 1],
    [49, "Datos básicos", 1],
    [50, "Datos intermedios", 2],
    [74, "Datos intermedios", 2],
    [75, "Datos completos", 3],
    [100, "Datos completos", 3],
  ])("reads %i points as %s", (score, label, dots) => {
    expect(confidenceLevel(score)).toEqual({ label, dots });
  });
});
