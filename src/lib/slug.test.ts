import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Cali", "cali"],
    ["El Águila", "el-aguila"],
    ["Jamundí", "jamundi"],
    ["La Unión", "la-union"],
    ["Riofrío", "riofrio"],
    ["  Cañón del  Río  ", "canon-del-rio"],
    ["San José (Antioquia)", "san-jose-antioquia"],
    ["Ünïcode—dashes_and/slashes", "unicode-dashes-and-slashes"],
  ])("turns %j into %j", (text, slug) => {
    expect(slugify(text)).toBe(slug);
    expect(slug).toMatch(SLUG_PATTERN);
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("¡¿?!")).toBe("");
  });
});

describe("SLUG_PATTERN", () => {
  it.each(["", "-cali", "cali-", "el--aguila", "El-Aguila", "jamundí"])("rejects %j", (slug) => {
    expect(slug).not.toMatch(SLUG_PATTERN);
  });
});
