import { describe, expect, it } from "vitest";
import {
  matchByWordStart,
  moveActive,
  normalizeForSearch,
  placeCountLabel,
} from "./municipality-search";

const options = [
  "Alcalá",
  "Buenaventura",
  "Buga",
  "Bugalagrande",
  "Cali",
  "Calima",
  "El Águila",
  "El Cerrito",
  "Guacarí",
  "Riofrío",
].map((name) => ({ name }));

const names = (query: string) => matchByWordStart(options, query).map((option) => option.name);

describe("normalizeForSearch", () => {
  it("drops accents, case and extra spaces", () => {
    expect(normalizeForSearch("  El  ÁGUILA ")).toBe("el aguila");
    expect(normalizeForSearch("Riofrío")).toBe("riofrio");
  });
});

describe("matchByWordStart", () => {
  it("matches the start of the name, keeping the order", () => {
    expect(names("bu")).toEqual(["Buenaventura", "Buga", "Bugalagrande"]);
  });

  it("matches the start of any word", () => {
    expect(names("aguila")).toEqual(["El Águila"]);
    expect(names("cer")).toEqual(["El Cerrito"]);
  });

  it("ignores accents and case in both directions", () => {
    expect(names("ÁGUI")).toEqual(["El Águila"]);
    expect(names("guacari")).toEqual(["Guacarí"]);
    expect(names("riofrío")).toEqual(["Riofrío"]);
  });

  it("matches several words in sequence", () => {
    expect(names("el ag")).toEqual(["El Águila"]);
    expect(names("el")).toEqual(["El Águila", "El Cerrito"]);
  });

  it("does not match the middle of a word", () => {
    expect(names("ali")).toEqual([]);
  });

  it("returns every option for an empty query", () => {
    expect(names("  ")).toHaveLength(options.length);
  });
});

describe("moveActive", () => {
  it("starts at the first or last option", () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
  });

  it("wraps around", () => {
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
  });

  it("returns -1 without options", () => {
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});

describe("placeCountLabel", () => {
  it("uses the singular only for one", () => {
    expect(placeCountLabel(0)).toBe("0 sitios");
    expect(placeCountLabel(1)).toBe("1 sitio");
    expect(placeCountLabel(101)).toBe("101 sitios");
  });
});
