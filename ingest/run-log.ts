import { eq } from "drizzle-orm";
import { ingestRuns } from "@db/schema";
import type { IngestDb } from "./db";
import type { RunLog, SourceOutcome } from "./run";

/** Error messages kept per run; error_count still counts them all. */
export const MAX_STORED_ERRORS = 100;

/** Items that could not be saved, or the error that stopped the source. */
function errorMessages(outcome: SourceOutcome): string[] {
  if (outcome.stats) return outcome.stats.errors;
  if (outcome.ok) return [];
  return [outcome.error instanceof Error ? outcome.error.message : String(outcome.error)];
}

/** The ingest_runs columns written when a source run ends. */
export function finishedRunValues(outcome: SourceOutcome, finishedAt: Date) {
  const stats = outcome.stats;
  const errors = errorMessages(outcome);
  return {
    finishedAt,
    status: outcome.ok ? ("succeeded" as const) : ("failed" as const),
    createdCount: stats?.created ?? 0,
    updatedCount: stats?.updated ?? 0,
    unchangedCount: stats?.unchanged ?? 0,
    removedCount: stats?.removed ?? 0,
    discardedCount: stats?.discarded ?? 0,
    errorCount: errors.length,
    errors: errors.slice(0, MAX_STORED_ERRORS),
  };
}

/** Records each source run in ingest_runs (HU-33); a crashed run stays "running". */
export function ingestRunLog(db: IngestDb, now: () => Date = () => new Date()): RunLog {
  return {
    async start(source) {
      const [row] = await db
        .insert(ingestRuns)
        .values({ source, startedAt: now() })
        .returning({ id: ingestRuns.id });
      if (!row) throw new Error("Insert returned no row");
      return row.id;
    },
    async finish(id, outcome) {
      await db
        .update(ingestRuns)
        .set(finishedRunValues(outcome, now()))
        .where(eq(ingestRuns.id, id));
    },
  };
}
