import { describe, expect, it } from "vitest";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  activeFilters,
  findUnknownSlug,
  parsePlaceFilters,
  parsePlaceQuery,
  withoutFilter,
} from "./filters";

const parse = (query: string) => parsePlaceFilters(new URLSearchParams(query));

describe("parsePlaceFilters", () => {
  it("returns no filters for an empty query", () => {
    expect(parse("")).toEqual({
      ok: true,
      value: {
        municipality: undefined,
        placeTypes: undefined,
        activities: undefined,
        difficulties: undefined,
        origins: undefined,
        freeAccessOnly: false,
      },
    });
  });

  it("reads every filter, splitting lists by commas", () => {
    const result = parse(
      "lugar=dagua&tipo=cascada,rio&actividad=senderismo&dificultad=facil,sin-dato&origen=comunidad&acceso=libre",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        municipality: "dagua",
        placeTypes: ["cascada", "rio"],
        activities: ["senderismo"],
        difficulties: ["easy", null],
        origins: ["community"],
        freeAccessOnly: true,
      },
    });
  });

  it("maps every difficulty and origin to its stored value", () => {
    const result = parse("dificultad=facil,moderada,dificil,sin-dato&origen=abiertas,comunidad");

    expect(result.ok && result.value.difficulties).toEqual(["easy", "moderate", "hard", null]);
    expect(result.ok && result.value.origins).toEqual(["open_data", "community"]);
  });

  it("drops repeated values and spaces around commas", () => {
    expect(parse("tipo=rio, cascada,rio")).toMatchObject({
      ok: true,
      value: { placeTypes: ["rio", "cascada"] },
    });
  });

  it("ignores empty and unknown parameters", () => {
    const result = parse("tipo=&lugar=%20&page=2&color=azul");

    expect(result).toMatchObject({
      ok: true,
      value: { municipality: undefined, placeTypes: undefined },
    });
  });

  it.each([
    ["lugar=dagua,cali", "lugar: admite un solo municipio."],
    ["lugar=Dagua", 'lugar: "Dagua" no es un valor válido.'],
    ["tipo=cascada,", 'tipo: "" no es un valor válido.'],
    ["actividad=ba%C3%B1o", 'actividad: "baño" no es un valor válido.'],
    [
      "dificultad=extrema",
      'dificultad: "extrema" no es válido; usa facil, moderada, dificil, sin-dato.',
    ],
    ["origen=osm", 'origen: "osm" no es válido; usa abiertas, comunidad.'],
    ["acceso=restringido", 'acceso: el único valor es "libre".'],
    ["tipo=cascada&tipo=rio", "tipo: aparece más de una vez; separa los valores con comas."],
  ])("rejects %s", (query, message) => {
    expect(parse(query)).toEqual({ ok: false, message });
  });
});

describe("parsePlaceQuery", () => {
  const query = (search: string) => parsePlaceQuery(new URLSearchParams(search));

  it("defaults to highest confidence, page 1 and 24 sites per page", () => {
    expect(query("")).toMatchObject({
      ok: true,
      value: { sort: "confianza", page: 1, pageSize: 24 },
    });
  });

  it("reads the order, page and page size with the filters", () => {
    expect(query("tipo=cascada&orden=recientes&pagina=3&por-pagina=100")).toMatchObject({
      ok: true,
      value: {
        filters: { placeTypes: ["cascada"] },
        sort: "recientes",
        page: 3,
        pageSize: 100,
      },
    });
  });

  it("accepts every order", () => {
    for (const sort of ["confianza", "recientes", "alfabetico"]) {
      expect(query(`orden=${sort}`)).toMatchObject({ ok: true, value: { sort } });
    }
  });

  it("ignores empty order and page parameters", () => {
    expect(query("orden=&pagina=")).toMatchObject({
      ok: true,
      value: { sort: "confianza", page: 1 },
    });
  });

  it("reports filter errors first", () => {
    expect(query("tipo=Rio&pagina=0")).toEqual({
      ok: false,
      message: 'tipo: "Rio" no es un valor válido.',
    });
  });

  it.each([
    ["orden=distancia", 'orden: "distancia" no es válido; usa confianza, recientes, alfabetico.'],
    ["pagina=0", "pagina: debe ser 1 o más."],
    ["pagina=-1", 'pagina: "-1" no es un valor válido.'],
    ["pagina=1.5", 'pagina: "1.5" no es un valor válido.'],
    ["pagina=dos", 'pagina: "dos" no es un valor válido.'],
    ["por-pagina=0", "por-pagina: debe ser 1 o más."],
    ["por-pagina=101", "por-pagina: el máximo es 100."],
    ["pagina=1&pagina=2", "pagina: aparece más de una vez."],
  ])("rejects %s", (search, message) => {
    expect(query(search)).toEqual({ ok: false, message });
  });
});

describe("activeFilters", () => {
  it("lists the filters that narrow the search, in URL order", () => {
    const filters = parse("acceso=libre&tipo=cascada&lugar=dagua");
    expect(filters.ok && activeFilters(filters.value)).toEqual(["lugar", "tipo", "acceso"]);
  });

  it("is empty without filters", () => {
    const filters = parse("");
    expect(filters.ok && activeFilters(filters.value)).toEqual([]);
  });
});

describe("withoutFilter", () => {
  it("removes one filter and keeps the others", () => {
    const filters = parse("tipo=cascada,rio&actividad=senderismo&acceso=libre");
    if (!filters.ok) throw new Error(filters.message);

    expect(withoutFilter(filters.value, "tipo")).toMatchObject({
      placeTypes: undefined,
      activities: ["senderismo"],
      freeAccessOnly: true,
    });
    expect(withoutFilter(filters.value, "acceso").freeAccessOnly).toBe(false);
  });
});

describe("findUnknownSlug", () => {
  const catalogs: Catalogs = {
    municipalities: [{ slug: "dagua", name: "Dagua" }],
    placeTypes: [
      { slug: "cascada", name: "Cascada" },
      { slug: "rio", name: "Río" },
    ],
    activities: [{ slug: "senderismo", name: "Senderismo" }],
  };

  it("accepts slugs that exist", () => {
    const filters = {
      municipality: "dagua",
      placeTypes: ["cascada", "rio"],
      activities: ["senderismo"],
      freeAccessOnly: false,
    };

    expect(findUnknownSlug(filters, catalogs)).toBeUndefined();
  });

  it("accepts no filters", () => {
    expect(findUnknownSlug({ freeAccessOnly: false }, catalogs)).toBeUndefined();
  });

  it.each([
    [{ municipality: "cali" }, 'lugar: "cali" no existe; consulta /api/v1/catalogs.'],
    [{ placeTypes: ["rio", "volcan"] }, 'tipo: "volcan" no existe; consulta /api/v1/catalogs.'],
    [{ activities: ["buceo"] }, 'actividad: "buceo" no existe; consulta /api/v1/catalogs.'],
  ])("reports %o", (filters, message) => {
    expect(findUnknownSlug({ ...filters, freeAccessOnly: false }, catalogs)).toBe(message);
  });
});
