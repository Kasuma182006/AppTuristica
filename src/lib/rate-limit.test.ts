import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import * as schema from "@db/schema";
import type { Db } from "@/lib/db";
import {
  API_RATE_LIMIT,
  consumeRateLimit,
  deleteExpiredRateLimits,
  rateLimitResult,
  windowStart,
} from "./rate-limit";

const rule = { scope: "api", limit: 60, windowMs: 60_000 };

describe("windowStart", () => {
  it("aligns to the start of the minute", () => {
    expect(windowStart(new Date("2026-10-26T15:04:37.250Z"), 60_000)).toEqual(
      new Date("2026-10-26T15:04:00.000Z"),
    );
  });

  it("aligns daily windows to midnight UTC", () => {
    expect(windowStart(new Date("2026-10-26T15:04:37Z"), 86_400_000)).toEqual(
      new Date("2026-10-26T00:00:00Z"),
    );
  });
});

describe("rateLimitResult", () => {
  const now = new Date("2026-10-26T15:04:37.250Z");

  it("allows requests up to the limit", () => {
    expect(rateLimitResult(1, now, rule).allowed).toBe(true);
    expect(rateLimitResult(60, now, rule).allowed).toBe(true);
  });

  it("rejects requests past the limit", () => {
    expect(rateLimitResult(61, now, rule).allowed).toBe(false);
  });

  it("says how many seconds remain until the window resets, rounded up", () => {
    expect(rateLimitResult(61, now, rule).retryAfterS).toBe(23);
  });

  it("waits at least one second", () => {
    expect(rateLimitResult(61, new Date("2026-10-26T15:04:59.999Z"), rule).retryAfterS).toBe(1);
  });

  it("marks the first request of a window", () => {
    expect(rateLimitResult(1, now, rule).newWindow).toBe(true);
    expect(rateLimitResult(2, now, rule).newWindow).toBe(false);
  });
});

describe("API_RATE_LIMIT", () => {
  it("allows 60 requests per minute", () => {
    expect(API_RATE_LIMIT).toEqual({ scope: "api", limit: 60, windowMs: 60_000 });
  });
});

/** Queries a call sends to a database without a connection (the first one fails). */
async function sentQueries(call: (db: Db) => Promise<unknown>) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const db = drizzle.mock({
    schema,
    logger: { logQuery: (sql, params) => queries.push({ sql, params }) },
  });
  await call(db as unknown as Db).catch(() => undefined);
  return queries;
}

describe("consumeRateLimit", () => {
  it("counts atomically with one upsert keyed by scope and IP hash", async () => {
    const hash = "f".repeat(64);
    const [query] = await sentQueries((db) =>
      consumeRateLimit(db, hash, rule, new Date("2026-10-26T15:04:37Z")),
    );

    expect(query?.sql).toMatch(
      /^insert into "rate_limits" .* on conflict \("key","window_start"\) do update set "count" = "rate_limits"\."count" \+ 1 returning "count"$/,
    );
    expect(query?.params).toEqual(
      expect.arrayContaining([
        `api:${hash}`,
        "2026-10-26T15:04:00.000Z",
        "2026-10-26T15:05:00.000Z",
      ]),
    );
  });
});

describe("deleteExpiredRateLimits", () => {
  it("deletes every counter whose window has ended", async () => {
    const [query] = await sentQueries((db) =>
      deleteExpiredRateLimits(db, new Date("2026-10-26T15:04:37Z")),
    );

    expect(query?.sql).toBe('delete from "rate_limits" where "rate_limits"."expires_at" <= $1');
    expect(query?.params).toEqual(["2026-10-26T15:04:37.000Z"]);
  });
});
