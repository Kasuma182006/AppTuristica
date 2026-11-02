import { describe, expect, it } from "vitest";
import { municipalityPath, placePath } from "./routes";

describe("placePath", () => {
  it("puts site pages under /sitio", () => {
    expect(placePath("embalse-de-calima")).toBe("/sitio/embalse-de-calima");
  });
});

describe("municipalityPath", () => {
  it("puts municipality pages under /lugar, without page 1", () => {
    expect(municipalityPath("cali")).toBe("/lugar/cali");
    expect(municipalityPath("cali", 1)).toBe("/lugar/cali");
  });

  it("adds later pages", () => {
    expect(municipalityPath("cali", 3)).toBe("/lugar/cali?pagina=3");
  });
});
