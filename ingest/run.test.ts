import { describe, expect, it } from "vitest";
import type { IngestDb } from "./db";
import { formatOutcome, runSources } from "./run";
import type { IngestContext, IngestSource } from "./sources/types";

// Sources in these tests never touch the database.
const context: IngestContext = { db: {} as IngestDb };

function fakeSource(name: string, run: () => Promise<void>): IngestSource {
  return { name, description: `fuente ${name}`, run };
}

describe("runSources", () => {
  it("runs the sources in order, passing the shared context", async () => {
    const calls: string[] = [];
    const seen: IngestContext[] = [];
    const record = (name: string) => ({
      name,
      description: `fuente ${name}`,
      run: async (ctx: IngestContext) => {
        calls.push(name);
        seen.push(ctx);
      },
    });
    const outcomes = await runSources([record("a"), record("b")], context);
    expect(calls).toEqual(["a", "b"]);
    expect(seen).toEqual([context, context]);
    expect(outcomes.map((o) => [o.name, o.ok])).toEqual([
      ["a", true],
      ["b", true],
    ]);
  });

  it("keeps running after a source fails and records its error", async () => {
    const failure = new Error("network down");
    const calls: string[] = [];
    const outcomes = await runSources(
      [
        fakeSource("a", async () => {
          throw failure;
        }),
        fakeSource("b", async () => void calls.push("b")),
      ],
      context,
    );
    expect(calls).toEqual(["b"]);
    expect(outcomes[0]).toMatchObject({ name: "a", ok: false, error: failure });
    expect(outcomes[1]).toMatchObject({ name: "b", ok: true });
  });

  it("measures each source's duration", async () => {
    const ticks = [0, 1500, 2000, 2250];
    const now = () => ticks.shift() ?? 0;
    const outcomes = await runSources(
      [fakeSource("a", async () => {}), fakeSource("b", async () => {})],
      context,
      now,
    );
    expect(outcomes.map((o) => o.durationMs)).toEqual([1500, 250]);
  });
});

describe("formatOutcome", () => {
  it("formats success and failure", () => {
    expect(formatOutcome({ name: "osm", ok: true, durationMs: 1234 })).toBe("osm: ok (1.2s)");
    expect(
      formatOutcome({ name: "rnt", ok: false, durationMs: 500, error: new Error("timeout") }),
    ).toBe("rnt: failed after 0.5s: timeout");
  });
});
