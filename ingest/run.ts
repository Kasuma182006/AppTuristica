import type { IngestContext, IngestSource, SourceStats } from "./sources/types";

export type SourceOutcome =
  | { name: string; ok: true; durationMs: number; stats: SourceStats }
  // `stats` is null when the source threw; with stats, some items could not be saved.
  | { name: string; ok: false; durationMs: number; stats: SourceStats | null; error: unknown };

/** Where each source run is recorded (ingest_runs, HU-33). */
export interface RunLog {
  /** Records the start of a source run and returns its id. */
  start(source: string): Promise<number>;
  finish(id: number, outcome: SourceOutcome): Promise<void>;
}

export interface RunOptions {
  now?: () => number;
  log?: RunLog;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function outcomeOf(name: string, durationMs: number, stats: SourceStats): SourceOutcome {
  if (stats.errors.length === 0) return { name, ok: true, durationMs, stats };
  const error = new Error(`${stats.errors.length} items could not be saved`);
  return { name, ok: false, durationMs, stats, error };
}

/** Records the end of a run; failing to record it fails the source. */
async function finish(log: RunLog, id: number, outcome: SourceOutcome): Promise<SourceOutcome> {
  try {
    await log.finish(id, outcome);
    return outcome;
  } catch (error) {
    if (!outcome.ok) return outcome;
    return {
      ...outcome,
      ok: false,
      error: new Error(`could not record the run: ${errorMessage(error)}`),
    };
  }
}

/**
 * Runs the sources one after another, recording each one in the run log. A failing source does
 * not stop the others: its error is recorded so the caller can exit with a failure code once all
 * of them have run.
 */
export async function runSources(
  sources: readonly IngestSource[],
  context: IngestContext,
  options: RunOptions = {},
): Promise<SourceOutcome[]> {
  const now = options.now ?? performance.now.bind(performance);
  const outcomes: SourceOutcome[] = [];
  for (const source of sources) {
    const start = now();
    let id: number | undefined;
    let outcome: SourceOutcome;
    try {
      id = await options.log?.start(source.name);
      const stats = await source.run(context);
      outcome = outcomeOf(source.name, now() - start, stats);
    } catch (error) {
      outcome = { name: source.name, ok: false, durationMs: now() - start, stats: null, error };
    }
    if (options.log && id !== undefined) outcome = await finish(options.log, id, outcome);
    outcomes.push(outcome);
  }
  return outcomes;
}

export function formatStats(stats: SourceStats): string {
  return (
    `${stats.created} created, ${stats.updated} updated, ${stats.unchanged} unchanged, ` +
    `${stats.removed} removed, ${stats.discarded} discarded, ${stats.errors.length} errors`
  );
}

/** The summary line of a source, e.g. "osm: ok (894.0s): 0 created, 0 updated, …". */
export function formatOutcome(outcome: SourceOutcome): string {
  const seconds = (outcome.durationMs / 1000).toFixed(1);
  if (outcome.ok) return `${outcome.name}: ok (${seconds}s): ${formatStats(outcome.stats)}`;
  const stats = outcome.stats ? ` (${formatStats(outcome.stats)})` : "";
  return `${outcome.name}: failed after ${seconds}s: ${errorMessage(outcome.error)}${stats}`;
}
