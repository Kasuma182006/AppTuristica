import { lte, sql } from "drizzle-orm";
import { rateLimits } from "@db/schema";
import type { Db } from "@/lib/db";

export interface RateLimit {
  /** Prefix of the counter key, e.g. "api" (HU-41) or "proposals" (HU-82). */
  scope: string;
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

/** HU-41: every route under /api/v1 together, per IP. */
export const API_RATE_LIMIT: RateLimit = { scope: "api", limit: 60, windowMs: 60_000 };

export interface RateLimitResult {
  allowed: boolean;
  /** Whole seconds until the window resets (at least 1). */
  retryAfterS: number;
  /** True for the first request of the window: a good moment to delete expired counters. */
  newWindow: boolean;
}

/** Start of the fixed window containing `now`, aligned to the epoch. */
export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** Pure decision for a request that brought the window's counter to `count`. */
export function rateLimitResult(
  count: number,
  now: Date,
  { limit, windowMs }: RateLimit,
): RateLimitResult {
  const resetAt = windowStart(now, windowMs).getTime() + windowMs;
  return {
    allowed: count <= limit,
    retryAfterS: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
    newWindow: count === 1,
  };
}

/** Counts a request for `ipHash` in the current window, atomically, and decides on it. */
export async function consumeRateLimit(
  db: Db,
  ipHash: string,
  rule: RateLimit,
  now = new Date(),
): Promise<RateLimitResult> {
  const start = windowStart(now, rule.windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({
      key: `${rule.scope}:${ipHash}`,
      windowStart: start,
      expiresAt: new Date(start.getTime() + rule.windowMs),
    })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  if (!row) throw new Error("rate_limits upsert returned no row");

  return rateLimitResult(row.count, now, rule);
}

/** Deletes counters whose window has ended: IP hashes are kept only while needed (RNF-05). */
export async function deleteExpiredRateLimits(db: Db, now = new Date()): Promise<void> {
  await db.delete(rateLimits).where(lte(rateLimits.expiresAt, now));
}
