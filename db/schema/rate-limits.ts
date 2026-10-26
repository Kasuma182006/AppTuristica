import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Request counters per IP and fixed window (HU-41 for the API, HU-82 for proposals). Postgres
// instead of Redis (CLAUDE.md): one atomic upsert per request.
export const rateLimits = pgTable(
  "rate_limits",
  {
    // "<scope>:<HMAC-SHA256 of the IP, hex>", e.g. "api:3f…", never the IP itself (RNF-05).
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
    // End of the window: expired rows are deleted, so no IP hash outlives it (RNF-05).
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index("rate_limits_expires_at_idx").on(t.expiresAt),
    // Rejects anything that is not a scoped hash, such as a plain IP.
    check("rate_limits_key_format", sql`${t.key} ~ '^[a-z0-9-]+:[0-9a-f]{64}$'`),
    check("rate_limits_count_positive", sql`${t.count} > 0`),
    check("rate_limits_window_order", sql`${t.expiresAt} > ${t.windowStart}`),
  ],
).enableRLS();
