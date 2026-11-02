import { describe, expect, it } from "vitest";
import { municipalityFromSlug, slugFromPath } from "./municipality-from-slug";

const municipalities = [
  { slug: "cali", name: "Cali" },
  { slug: "calima", name: "Calima" },
  { slug: "el-cerrito", name: "El Cerrito" },
  { slug: "la-union", name: "La Unión" },
];

describe("municipalityFromSlug", () => {
  it("finds the municipality at the end of a site slug", () => {
    expect(municipalityFromSlug("rio-pance-cali", municipalities)?.name).toBe("Cali");
    expect(municipalityFromSlug("salto-la-union", municipalities)?.name).toBe("La Unión");
  });

  it("does not take a municipality whose name only ends the same way", () => {
    expect(municipalityFromSlug("lago-calima", municipalities)?.name).toBe("Calima");
    expect(municipalityFromSlug("reserva-el-cerrito", municipalities)?.name).toBe("El Cerrito");
  });

  it("matches a slug that is the municipality itself", () => {
    expect(municipalityFromSlug("cali", municipalities)?.name).toBe("Cali");
  });

  it("is undefined when no municipality matches", () => {
    expect(municipalityFromSlug("no-existe", municipalities)).toBeUndefined();
    expect(municipalityFromSlug("supercali", municipalities)).toBeUndefined();
  });
});

describe("slugFromPath", () => {
  it("reads the slug of a site page path", () => {
    expect(slugFromPath("/lugar/rio-pance-cali")).toBe("rio-pance-cali");
    expect(slugFromPath("/lugar/rio-pance-cali/")).toBe("rio-pance-cali");
  });

  it("ignores other paths", () => {
    expect(slugFromPath("/explorar")).toBeUndefined();
    expect(slugFromPath("/lugar/a/b")).toBeUndefined();
  });
});
