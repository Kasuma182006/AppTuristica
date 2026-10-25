import { describe, expect, it } from "vitest";
import { planAgencies, toAgency, type RntAgency, type StoredAgency } from "./agencies";

describe("toAgency", () => {
  const row = {
    codigo_rnt: "68",
    cod_mun: "76001",
    razon_social_establecimiento: "AVIATUR CALI LA FLORA",
    sub_categoria: "AGENCIA DE VIAJES Y DE TURISMO",
    num_celular: "6645050",
    correo_establecimiento: "Ventas@Aviatur.com",
  };

  it("keeps the normalized contact of a company", () => {
    expect(toAgency({ ...row, nit: "860000018" })).toEqual({
      rntNumber: 68,
      name: "Aviatur Cali La Flora",
      municipalityCode: "76001",
      phone: "6026645050",
      email: "ventas@aviatur.com",
    });
  });

  it("drops the contact of a natural person's agency", () => {
    expect(toAgency({ ...row, nit: "16669569" })).toMatchObject({ phone: null, email: null });
    expect(toAgency(row)).toMatchObject({ phone: null, email: null });
  });
});

const CALI = 1;
const municipalityIds = new Map([["76001", CALI]]);

function listed(rntNumber: number, overrides: Partial<RntAgency> = {}): RntAgency {
  return {
    rntNumber,
    name: "Viajes Calima",
    municipalityCode: "76001",
    phone: "3001234567",
    email: null,
    ...overrides,
  };
}

function stored(
  id: number,
  rntNumber: number,
  overrides: Partial<StoredAgency> = {},
): StoredAgency {
  return {
    id,
    rntNumber,
    name: "Viajes Calima",
    municipalityId: CALI,
    phone: "3001234567",
    email: null,
    status: "active",
    ...overrides,
  };
}

describe("planAgencies", () => {
  it("creates new agencies and leaves unchanged ones alone", () => {
    const plan = planAgencies([listed(1), listed(2)], [stored(10, 1)], municipalityIds);
    expect(plan.creates).toEqual([
      {
        rntNumber: 2,
        name: "Viajes Calima",
        municipalityId: CALI,
        phone: "3001234567",
        email: null,
      },
    ]);
    expect(plan.unchangedIds).toEqual([10]);
    expect(plan.updates).toEqual([]);
  });

  it("updates changed agencies and reactivates those back in the RNT", () => {
    const plan = planAgencies(
      [listed(1, { phone: null }), listed(2)],
      [stored(10, 1), stored(11, 2, { status: "inactive" })],
      municipalityIds,
    );
    expect(plan.updates.map((u) => [u.id, u.fields.phone])).toEqual([
      [10, null],
      [11, "3001234567"],
    ]);
  });

  it("inactivates active agencies the RNT no longer lists", () => {
    const plan = planAgencies(
      [listed(1)],
      [stored(10, 1), stored(11, 2), stored(12, 3, { status: "inactive" })],
      municipalityIds,
    );
    expect(plan.inactivateIds).toEqual([11]);
  });

  it("leaves out agencies of unknown municipalities and repeated RNT numbers", () => {
    const plan = planAgencies(
      [listed(1), listed(1, { name: "Otra" }), listed(2, { municipalityCode: "05001" })],
      [],
      municipalityIds,
    );
    expect(plan.creates.map((c) => c.name)).toEqual(["Viajes Calima"]);
    expect(plan.unknownMunicipality).toEqual([2]);
  });
});
