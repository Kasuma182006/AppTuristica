import type { IngestSource } from "./sources/types";

export type SourceOutcome =
  | { name: string; ok: true; durationMs: number }
  | { name: string; ok: false; durationMs: number; error: unknown };

/**
 * Runs the sources one after another. A failing source does not stop the others: its error is
 * recorded so the caller can exit with a failure code once all of them have run.
 */
export async function runSources(
  sources: readonly IngestSource[],
  now: () => number = performance.now.bind(performance),
): Promise<SourceOutcome[]> {
  const outcomes: SourceOutcome[] = [];
  for (const source of sources) {
    const start = now();
    try {
      await source.run();
      outcomes.push({ name: source.name, ok: true, durationMs: now() - start });
    } catch (error) {
      outcomes.push({ name: source.name, ok: false, durationMs: now() - start, error });
    }
  }
  return outcomes;
}

export function formatOutcome(outcome: SourceOutcome): string {
  const seconds = (outcome.durationMs / 1000).toFixed(1);
  if (outcome.ok) return `${outcome.name}: ok (${seconds}s)`;
  const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
  return `${outcome.name}: failed after ${seconds}s: ${message}`;
}
