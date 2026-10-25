import { describe, expect, it } from "vitest";
import { isCompanyNit, normalizeEmail, normalizePhone, titleCaseName } from "./normalize";

describe("isCompanyNit", () => {
  it("accepts company NITs", () => {
    expect(isCompanyNit("860000018")).toBe(true);
    expect(isCompanyNit("900.123.456")).toBe(true);
  });

  it("rejects cédulas of natural persons and missing values", () => {
    expect(isCompanyNit("16669569")).toBe(false);
    expect(isCompanyNit("1114825971")).toBe(false);
    expect(isCompanyNit("42136560")).toBe(false);
    expect(isCompanyNit(undefined)).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("takes the mobile field first, as ten digits", () => {
    expect(normalizePhone("316 052 9999", "6026677272")).toBe("3160529999");
    expect(normalizePhone("+57 300 123 4567", undefined)).toBe("3001234567");
  });

  it("completes old seven-digit fixed lines with 602", () => {
    expect(normalizePhone("6645050", "Sin dato")).toBe("6026645050");
    expect(normalizePhone("3989053", undefined)).toBe("6023989053");
  });

  it("falls back to the fixed-line field when the mobile one is invalid", () => {
    expect(normalizePhone("0", "3172430742")).toBe("3172430742");
    expect(normalizePhone("318453674", "6028857709")).toBe("6028857709");
  });

  it("returns null when neither is valid", () => {
    expect(normalizePhone("Sin dato", "8612345678")).toBeNull();
    expect(normalizePhone(undefined, undefined)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases valid emails", () => {
    expect(normalizeEmail(" Ventas@Aviatur.com ")).toBe("ventas@aviatur.com");
  });

  it("drops invalid or missing emails", () => {
    expect(normalizeEmail("agencia@gmail")).toBeNull();
    expect(normalizeEmail("Sin dato")).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("titleCaseName", () => {
  it.each([
    ["AVIATUR CALI LA FLORA", "Aviatur Cali La Flora"],
    ["VIAJES CIRCULAR SAS", "Viajes Circular SAS"],
    [
      "AGENCIA DE VIAJES Y TURISMO SANTA ANA TRAVEL",
      "Agencia de Viajes y Turismo Santa Ana Travel",
    ],
    ["TURISMO DEL PACÍFICO S.A.S.", "Turismo del Pacífico S.A.S."],
    ["VIAJES A.M.T. LTDA", "Viajes A.M.T. LTDA"],
    ["C&D TOURS", "C&D Tours"],
    ["COLOMBIAVIAJA.COM", "colombiaviaja.com"],
    ["  J E   TOURS ", "J E Tours"],
    ["A DONDE VAMOS", "A Donde Vamos"],
  ])("formats %s as %s", (raw, formatted) => {
    expect(titleCaseName(raw)).toBe(formatted);
  });
});
