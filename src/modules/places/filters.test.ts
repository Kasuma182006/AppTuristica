import { describe, expect, it } from "vitest";
import type { Catalogs } from "@/modules/catalogs/types";
import { findUnknownSlug, parsePlaceFilters } from "./filters";

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
