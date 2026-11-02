import { describe, expect, it } from "vitest";
import { municipalityMetaDescription, placeMetaDescription, truncate } from "./meta-description";

const calima = {
  name: "Embalse de Calima",
  description: "Embalse en Calima, Valle del Cauca. La entrada es gratuita.",
  origin: "abiertas" as const,
  activities: [
    { slug: "pesca", name: "Pesca" },
    { slug: "deportes-acuaticos", name: "Deportes acuáticos" },
  ],
  placeType: { slug: "lago", name: "Lago o laguna" },
  municipality: { slug: "calima", name: "Calima" },
  department: "Valle del Cauca",
};

describe("truncate", () => {
  it("keeps short texts", () => {
    expect(truncate("Cascada en Dagua.", 160)).toBe("Cascada en Dagua.");
  });

  it("cuts long texts at a word, with an ellipsis", () => {
    expect(truncate("Tramo del río en Cali, Valle del Cauca.", 20)).toBe("Tramo del río en…");
    expect(truncate("Pico en Cali, Valle del Cauca.", 15)).toBe("Pico en Cali…");
  });
});

describe("placeMetaDescription", () => {
  it("puts the name first, then the template in lowercase and the activities", () => {
    expect(placeMetaDescription(calima)).toBe(
      "Embalse de Calima: embalse en Calima, Valle del Cauca. La entrada es gratuita. " +
        "Actividades: pesca, deportes acuáticos.",
    );
  });

  it("leaves out the activities when there are none", () => {
    expect(placeMetaDescription({ ...calima, activities: [] })).toBe(
      "Embalse de Calima: embalse en Calima, Valle del Cauca. La entrada es gratuita.",
    );
  });

  it("keeps community texts as written", () => {
    const community = { ...calima, origin: "comunidad" as const, activities: [] };
    expect(
      placeMetaDescription({ ...community, description: "Charco La Vieja, de agua fría." }),
    ).toBe("Embalse de Calima: Charco La Vieja, de agua fría.");
  });

  it("describes sites without a description by their type and place", () => {
    expect(placeMetaDescription({ ...calima, description: null, activities: [] })).toBe(
      "Embalse de Calima: lago o laguna en Calima, Valle del Cauca.",
    );
  });

  it("stays within 160 characters", () => {
    const long = { ...calima, description: "Reserva natural en Calima. ".repeat(10) };
    const text = placeMetaDescription(long);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("municipalityMetaDescription", () => {
  const cali = { name: "Cali", department: "Valle del Cauca" };

  it("counts the sites and names the three most common types", () => {
    const types = [
      { name: "Cerro o pico", total: 50 },
      { name: "Reserva natural", total: 16 },
      { name: "Cascada", total: 12 },
      { name: "Río", total: 23 },
    ];
    expect(municipalityMetaDescription(cali, types)).toBe(
      "101 sitios turísticos poco conocidos en Cali, Valle del Cauca: cerro o pico (50), " +
        "reserva natural (16), cascada (12) y más.",
    );
  });

  it("says nothing more when every type is named", () => {
    expect(municipalityMetaDescription(cali, [{ name: "Cascada", total: 1 }])).toBe(
      "1 sitio turístico poco conocido en Cali, Valle del Cauca: cascada (1).",
    );
  });

  it("invites to propose a site when there are none", () => {
    expect(
      municipalityMetaDescription({ name: "Argelia", department: "Valle del Cauca" }, []),
    ).toBe("Aún no hay sitios publicados en Argelia, Valle del Cauca. Propón uno.");
  });
});
