import { describe, expect, it } from "vitest";

// Example test (HU-05): proves the runner and the "@/" alias work. Replace once real tests exist.
describe("vitest setup", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolves the @/ path alias", async () => {
    const mod = await import("@/app/page");
    expect(typeof mod.default).toBe("function");
  });
});
