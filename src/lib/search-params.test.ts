import { describe, expect, it } from "vitest";
import { toUrlSearchParams } from "./search-params";

describe("toUrlSearchParams", () => {
  it("keeps single values", () => {
    expect(toUrlSearchParams({ lugar: "dagua", tipo: "cascada,rio" }).toString()).toBe(
      "lugar=dagua&tipo=cascada%2Crio",
    );
  });

  it("keeps repeated keys repeated, so the parser can reject them", () => {
    expect(toUrlSearchParams({ tipo: ["cascada", "rio"] }).getAll("tipo")).toEqual([
      "cascada",
      "rio",
    ]);
  });

  it("skips undefined values and keeps empty ones", () => {
    const params = toUrlSearchParams({ lugar: undefined, tipo: "" });

    expect(params.has("lugar")).toBe(false);
    expect(params.get("tipo")).toBe("");
  });
});
