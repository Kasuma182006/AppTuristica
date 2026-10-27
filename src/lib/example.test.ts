import { describe, expect, it } from "vitest";

// Example test (HU-05): proves the runner and the "@/" alias work. Replace once real tests exist.
describe("vitest setup", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolves the @/ path alias", async () => {
    // A light module: importing a page pulls in the whole UI and database layer, which timed out
    // under load (HU-47, HU-50).
    const mod = await import("@/lib/slug");
    expect(typeof mod.slugify).toBe("function");
  });
});
