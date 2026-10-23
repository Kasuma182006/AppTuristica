import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { places } from "./places";

// Reasons offered in the report modal (RF-22, HU-84).
export const reportReasonEnum = pgEnum("report_reason", [
  "not_exists",
  "wrong_location",
  "false_info",
  "inappropriate",
  "dangerous",
]);

// Error reports from visitors (HU-18). Three reports hide a site (RF-23, HU-86).
export const reports = pgTable(
  "reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    comment: text("comment"),
    // Keyed hash of the reporter's IP (HMAC-SHA256, hex), never the IP itself (RNF-05).
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One report per IP and site (HU-85), so nobody can hide a site alone.
    unique("reports_place_ip_hash_unique").on(t.placeId, t.ipHash),
    check(
      "reports_comment_valid",
      sql`btrim(${t.comment}) <> '' AND char_length(${t.comment}) <= 1000`,
    ),
    // Rejects anything that is not a hash, such as a plain IP.
    check("reports_ip_hash_format", sql`${t.ipHash} ~ '^[0-9a-f]{64}$'`),
  ],
).enableRLS();
