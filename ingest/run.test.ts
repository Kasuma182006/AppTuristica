import { describe, expect, it } from "vitest";
import type { IngestDb } from "./db";
import { formatOutcome, runSources, type RunLog, type SourceOutcome } from "./run";
import type { IngestContext, IngestSource, SourceStats } from "./sources/types";

// Sources in these tests never touch the database.
const context: IngestContext = { db: {} as IngestDb };

const stats = (overrides: Partial<SourceStats> = {}): SourceStats => ({
  created: 0,
  updated: 0,
  unchanged: 0,
  removed: 0,
  discarded: 0,
  errors: [],
  ...overrides,
});

function fakeSource(
  name: string,
  run: (ctx: IngestContext) => Promise<SourceStats> = async () => stats(),
): IngestSource {
  return { name, description: `fuente ${name}`, run };
}

/** A run log in memory, failing `finish` when asked to. */
function memoryLog(failFinish = false) {
  const events: string[] = [];
  const finished: SourceOutcome[] = [];
  let next = 1;
  const log: RunLog = {
    start: async (source) => {
      events.push(`start ${source}`);
      return next++;
    },
    finish: async (id, outcome) => {
      if (failFinish) throw new Error("database down");
      events.push(`finish ${id}`);
      finished.push(outcome);
    },
  };
  return { log, events, finished };
}

describe("runSources", () => {
  it("runs the sources in order, passing the shared context", async () => {
    const calls: string[] = [];
    const seen: IngestContext[] = [];
    const record = (name: string) =>
      fakeSource(name, async (ctx) => {
        calls.push(name);
        seen.push(ctx);
        return stats({ created: 1 });
      });
    const outcomes = await runSources([record("a"), record("b")], context);
    expect(calls).toEqual(["a", "b"]);
    expect(seen).toEqual([context, context]);
    expect(outcomes.map((o) => [o.name, o.ok, o.stats?.created])).toEqual([
      ["a", true, 1],
      ["b", true, 1],
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
        fakeSource("b", async () => {
          calls.push("b");
          return stats();
        }),
      ],
      context,
    );
    expect(calls).toEqual(["b"]);
    expect(outcomes[0]).toMatchObject({ name: "a", ok: false, error: failure, stats: null });
    expect(outcomes[1]).toMatchObject({ name: "b", ok: true });
  });

  it("fails a source whose items could not all be saved, keeping its stats", async () => {
    const [outcome] = await runSources(
      [fakeSource("osm", async () => stats({ created: 5, errors: ["a: x", "b: y"] }))],
      context,
    );
    expect(outcome).toMatchObject({ ok: false, stats: { created: 5 } });
    expect(outcome?.ok === false && String(outcome.error)).toContain("2 items could not be saved");
  });

  it("records the start and end of each source in the run log", async () => {
    const { log, events, finished } = memoryLog();
    await runSources([fakeSource("osm"), fakeSource("rnt")], context, { log });
    expect(events).toEqual(["start osm", "finish 1", "start rnt", "finish 2"]);
    expect(finished.map((o) => o.name)).toEqual(["osm", "rnt"]);
  });

  it("fails a source whose run could not be recorded", async () => {
    const { log } = memoryLog(true);
    const [outcome] = await runSources([fakeSource("osm")], context, { log });
    expect(outcome?.ok).toBe(false);
    expect(outcome?.ok === false && String(outcome.error)).toContain("could not record the run");
  });

  it("measures each source's duration, until its run ends", async () => {
    let clock = 0;
    const now = () => clock;
    const slow = (name: string, ms: number) =>
      fakeSource(name, async () => {
        clock += ms;
        return stats();
      });
    const outcomes = await runSources([slow("a", 1500), slow("b", 250)], context, { now });
    expect(outcomes.map((o) => o.durationMs)).toEqual([1500, 250]);
  });
});

describe("formatOutcome", () => {
  it("formats success with the counts", () => {
    expect(
      formatOutcome({
        name: "osm",
        ok: true,
        durationMs: 1234,
        stats: stats({ unchanged: 522, discarded: 551 }),
      }),
    ).toBe(
      "osm: ok (1.2s): 0 created, 0 updated, 522 unchanged, 0 removed, 551 discarded, 0 errors",
    );
  });

  it("formats failures, with the counts when the source got to save", () => {
    expect(
      formatOutcome({
        name: "rnt",
        ok: false,
        durationMs: 500,
        stats: null,
        error: new Error("timeout"),
      }),
    ).toBe("rnt: failed after 0.5s: timeout");
    expect(
      formatOutcome({
        name: "osm",
        ok: false,
        durationMs: 500,
        stats: stats({ created: 3, errors: ["x"] }),
        error: new Error("1 items could not be saved"),
      }),
    ).toBe(
      "osm: failed after 0.5s: 1 items could not be saved " +
        "(3 created, 0 updated, 0 unchanged, 0 removed, 0 discarded, 1 errors)",
    );
  });
});
