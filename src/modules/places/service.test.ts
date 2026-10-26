import { describe, expect, it, vi } from "vitest";
import type { PlaceRow } from "./repository";

vi.mock("@/lib/db", () => ({ getDb: () => undefined }));

const { toPlaceSummary } = await import("./service");

const row: PlaceRow = {
  id: 7,
  slug: "salto-de-bitaco-dagua",
  name: "Salto de Bitaco",
  municipality: { slug: "dagua", name: "Dagua" },
  placeType: { slug: "cascada", name: "Cascada" },
  activities: [{ slug: "senderismo", name: "Senderismo" }],
  difficulty: "moderate",
  origin: "open_data",
  inProtectedArea: false,
  privateProperty: false,
  confidence: 35,
};

describe("toPlaceSummary", () => {
  it("returns the public fields with Spanish filter values", () => {
    expect(toPlaceSummary(row)).toEqual({
      slug: "salto-de-bitaco-dagua",
      name: "Salto de Bitaco",
      municipality: { slug: "dagua", name: "Dagua" },
      placeType: { slug: "cascada", name: "Cascada" },
      activities: [{ slug: "senderismo", name: "Senderismo" }],
      difficulty: "moderada",
      origin: "abiertas",
      restricted: false,
      confidence: 35,
    });
  });

  it("leaves out the internal id", () => {
    expect(toPlaceSummary(row)).not.toHaveProperty("id");
  });

  it("returns null when the difficulty is unknown", () => {
    expect(toPlaceSummary({ ...row, difficulty: null }).difficulty).toBeNull();
  });

  it("maps community sites", () => {
    expect(toPlaceSummary({ ...row, origin: "community" }).origin).toBe("comunidad");
  });

  it.each([
    ["in a protected area", { inProtectedArea: true }],
    ["on private property", { privateProperty: true }],
  ])("marks sites %s as restricted", (_label, flags) => {
    expect(toPlaceSummary({ ...row, ...flags }).restricted).toBe(true);
  });
});
