import { describe, expect, it } from "vitest";
import { claimSlug, siteSlug } from "./slug";

describe("siteSlug", () => {
  it("joins the name and the municipality", () => {
    expect(siteSlug("Cascada La Chorrera", "dagua")).toBe("cascada-la-chorrera-dagua");
    expect(siteSlug("Río Cauca", "cali")).toBe("rio-cauca-cali");
  });

  it("does not repeat the municipality when the name ends with it", () => {
    expect(siteSlug("Río Cali", "cali")).toBe("rio-cali");
    expect(siteSlug("Embalse de Calima", "calima")).toBe("embalse-de-calima");
    expect(siteSlug("Ansermanuevo", "ansermanuevo")).toBe("ansermanuevo");
    expect(siteSlug("Río El Cerrito", "el-cerrito")).toBe("rio-el-cerrito");
  });

  it("only drops whole words of the municipality", () => {
    expect(siteSlug("Mirador Bocali", "cali")).toBe("mirador-bocali-cali");
  });
});

describe("claimSlug", () => {
  it("adds a number when the slug is taken, and remembers it", () => {
    const taken = new Set(["cerro-de-la-bandera-cali"]);
    expect(claimSlug("cerro-de-la-bandera-cali", taken)).toBe("cerro-de-la-bandera-cali-2");
    expect(claimSlug("cerro-de-la-bandera-cali", taken)).toBe("cerro-de-la-bandera-cali-3");
    expect(claimSlug("rio-cauca-cali", taken)).toBe("rio-cauca-cali");
    expect(taken.has("rio-cauca-cali")).toBe(true);
  });
});
