import { describe, expect, it } from "vitest";
import { sources } from ".";

describe("ingest sources", () => {
  it("registers osm and rnt", () => {
    expect(sources.map((s) => s.name)).toEqual(["osm", "rnt"]);
  });

  it("uses unique lowercase CLI names", () => {
    const names = sources.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
