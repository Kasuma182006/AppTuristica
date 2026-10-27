import { describe, expect, it } from "vitest";
import { exploreHref, filterKey, filterKeyOf, pageHref, sortHref, splitList } from "./filter-url";

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

describe("filterKeyOf", () => {
  it("keeps only the filters, in a fixed order", () => {
    const params = new URLSearchParams("orden=recientes&tipo=rio&pagina=3&lugar=dagua");
    expect(filterKeyOf(params)).toBe("/explorar?lugar=dagua&tipo=rio");
  });

  it("matches the panel's values for the same filters", () => {
    expect(filterKeyOf(new URLSearchParams("tipo=cascada,rio"))).toBe(
      filterKey({ tipo: "cascada,rio", lugar: "", origen: "" }),
    );
    expect(filterKeyOf(new URLSearchParams("orden=alfabetico"))).toBe(filterKey({}));
  });
});

describe("pageHref", () => {
  it("adds the page at the end, keeping filters and order", () => {
    const current = new URLSearchParams("tipo=cascada,rio&orden=alfabetico&pagina=2");
    expect(pageHref(current, 3)).toBe("/explorar?tipo=cascada,rio&orden=alfabetico&pagina=3");
  });

  it("leaves page 1 out of the address", () => {
    expect(pageHref(new URLSearchParams("pagina=5"), 1)).toBe("/explorar");
    expect(pageHref(new URLSearchParams(), 2)).toBe("/explorar?pagina=2");
  });
});

describe("sortHref", () => {
  it("adds the order after the filters, with readable commas", () => {
    expect(sortHref(new URLSearchParams("tipo=cascada,rio"), "recientes")).toBe(
      "/explorar?tipo=cascada,rio&orden=recientes",
    );
  });

  it("replaces the order and returns to page 1", () => {
    const current = new URLSearchParams("lugar=dagua&orden=recientes&pagina=4&por-pagina=48");
    expect(sortHref(current, "alfabetico")).toBe(
      "/explorar?lugar=dagua&orden=alfabetico&por-pagina=48",
    );
  });

  it("leaves the default order out of the address", () => {
    expect(sortHref(new URLSearchParams("orden=alfabetico"), "confianza")).toBe("/explorar");
    expect(sortHref(new URLSearchParams("actividad=senderismo&orden=recientes"), "confianza")).toBe(
      "/explorar?actividad=senderismo",
    );
  });
});
