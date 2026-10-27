import { describe, expect, it } from "vitest";
import { exploreHref, splitList } from "./filter-url";

describe("splitList", () => {
  it("splits on commas and drops empty parts", () => {
    expect(splitList("cascada,rio")).toEqual(["cascada", "rio"]);
    expect(splitList(" cascada , ,rio,")).toEqual(["cascada", "rio"]);
    expect(splitList("")).toEqual([]);
  });
});

describe("exploreHref", () => {
  const none = new URLSearchParams();

  it("is /explorar alone without filters", () => {
    expect(exploreHref({}, none)).toBe("/explorar");
    expect(exploreHref({ lugar: "", tipo: "" }, none)).toBe("/explorar");
  });

  it("keeps commas readable (RF-04)", () => {
    expect(exploreHref({ tipo: "cascada,rio" }, none)).toBe("/explorar?tipo=cascada,rio");
  });

  it("puts the filters in a fixed order, whatever order they were chosen in", () => {
    const values = { acceso: "libre", actividad: "senderismo", lugar: "dagua" };
    expect(exploreHref(values, none)).toBe(
      "/explorar?lugar=dagua&actividad=senderismo&acceso=libre",
    );
  });

  it("keeps order and page size, drops the page and the old filters", () => {
    const current = new URLSearchParams("tipo=rio&orden=recientes&pagina=3&por-pagina=48");
    expect(exploreHref({ tipo: "cascada" }, current)).toBe(
      "/explorar?tipo=cascada&orden=recientes&por-pagina=48",
    );
  });

  it("encodes anything that is not a slug", () => {
    expect(exploreHref({ lugar: "a b&c" }, none)).toBe("/explorar?lugar=a%20b%26c");
  });
});
