/** How long a page waits for its data before showing the error and "Reintentar" (HU-56). */
export const PAGE_DATA_DEADLINE_MS = 10_000;

export class DeadlineError extends Error {
  override name = "DeadlineError";
}

/**
 * The promise's result, or a DeadlineError after `ms`. With the database down, postgres.js
 * keeps queued queries waiting while it reconnects, so a page would load forever (HU-56).
 */
export function withDeadline<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(`${what}: no respondió en ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
