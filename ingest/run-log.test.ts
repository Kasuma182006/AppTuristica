import { describe, expect, it } from "vitest";
import { finishedRunValues, MAX_STORED_ERRORS } from "./run-log";
import type { SourceStats } from "./sources/types";

const finishedAt = new Date("2026-10-25T03:00:00Z");
const stats: SourceStats = {
  created: 2,
  updated: 3,
  unchanged: 522,
  removed: 1,
  discarded: 551,
  errors: [],
};

describe("finishedRunValues", () => {
  it("records a successful run with its counts", () => {
    expect(finishedRunValues({ name: "osm", ok: true, durationMs: 1, stats }, finishedAt)).toEqual({
      finishedAt,
      status: "succeeded",
      createdCount: 2,
      updatedCount: 3,
      unchangedCount: 522,
      removedCount: 1,
      discardedCount: 551,
      errorCount: 0,
      errors: [],
    });
  });

  it("records the error of a source that stopped, with zero counts", () => {
    const values = finishedRunValues(
      {
        name: "osm",
        ok: false,
        durationMs: 1,
        stats: null,
        error: new Error("Every Overpass endpoint failed"),
      },
      finishedAt,
    );
    expect(values).toMatchObject({
      status: "failed",
      createdCount: 0,
      errorCount: 1,
      errors: ["Every Overpass endpoint failed"],
    });
  });

  it("records item errors, keeping at most the first 100 messages", () => {
    const errors = Array.from({ length: 150 }, (_, i) => `site-${i}: failed`);
    const values = finishedRunValues(
      {
        name: "osm",
        ok: false,
        durationMs: 1,
        stats: { ...stats, errors },
        error: new Error("150 items could not be saved"),
      },
      finishedAt,
    );
    expect(values.status).toBe("failed");
    expect(values.createdCount).toBe(2);
    expect(values.errorCount).toBe(150);
    expect(values.errors).toHaveLength(MAX_STORED_ERRORS);
    expect(values.errors[0]).toBe("site-0: failed");
  });
});
