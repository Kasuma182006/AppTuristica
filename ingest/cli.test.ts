import { describe, expect, it } from "vitest";
import { selectSources } from "./cli";
import type { IngestSource } from "./sources/types";

function fakeSource(name: string): IngestSource {
  return {
    name,
    description: `fuente ${name}`,
    run: async () => ({
      created: 0,
      updated: 0,
      unchanged: 0,
      removed: 0,
      discarded: 0,
      errors: [],
    }),
  };
}

const available = [fakeSource("osm"), fakeSource("rnt")];

describe("selectSources", () => {
  it("selects every source when no source is given", () => {
    expect(selectSources([], available).map((s) => s.name)).toEqual(["osm", "rnt"]);
  });

  it("selects a single source with --source=<name>", () => {
    expect(selectSources(["--source=rnt"], available).map((s) => s.name)).toEqual(["rnt"]);
  });

  it("accepts --source <name> as separate arguments", () => {
    expect(selectSources(["--source", "osm"], available).map((s) => s.name)).toEqual(["osm"]);
  });

  it("rejects an unknown source and lists the available ones", () => {
    expect(() => selectSources(["--source=wikidata"], available)).toThrow(
      'Unknown source "wikidata". Available: osm (fuente osm), rnt (fuente rnt)',
    );
  });

  it("rejects unknown flags and positional arguments", () => {
    expect(() => selectSources(["--all"], available)).toThrow();
    expect(() => selectSources(["osm"], available)).toThrow();
  });
});
