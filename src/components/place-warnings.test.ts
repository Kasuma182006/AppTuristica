import { describe, expect, it } from "vitest";
import { placeWarnings } from "./place-warnings";

const plain = {
  inProtectedArea: false,
  privateProperty: false,
  fragile: false,
  origin: "abiertas",
} as const;

const labels = (place: Parameters<typeof placeWarnings>[0]) =>
  placeWarnings(place).map((warning) => warning.label);

describe("placeWarnings", () => {
  it("has none for an open-data site without restrictions", () => {
    expect(placeWarnings(plain)).toEqual([]);
  });

  it("shows both protected area and fragile when they coincide", () => {
    expect(labels({ ...plain, inProtectedArea: true, fragile: true })).toEqual([
      "Área protegida",
      "Sitio frágil",
    ]);
  });

  it("lists every label in a fixed order", () => {
    expect(
      labels({ inProtectedArea: true, privateProperty: true, fragile: true, origin: "comunidad" }),
    ).toEqual([
      "Área protegida",
      "Propiedad privada",
      "Sitio frágil",
      "Propuesto por la comunidad · No verificado",
    ]);
  });

  it("explains each label and marks the community one as information", () => {
    const [privateProperty, community] = placeWarnings({
      ...plain,
      privateProperty: true,
      origin: "comunidad",
    });

    expect(privateProperty).toEqual({
      label: "Propiedad privada",
      explanation: "pide permiso al propietario antes de entrar.",
      tone: "warning",
    });
    expect(community?.tone).toBe("info");
  });
});
