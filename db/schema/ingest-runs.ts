import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const ingestRunStatusEnum = pgEnum("ingest_run_status", ["running", "succeeded", "failed"]);

// One row per source in each ingest run (HU-18, RF-34), written by the runner (HU-33) to review
// what happened: sites for "osm", agencies for "rnt", never added up.
export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // CLI name of the source (ingest/sources), e.g. "osm" or "rnt".
    source: text("source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    // Empty while running; a crashed run stays "running" with no end.
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: ingestRunStatusEnum("status").notNull().default("running"),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    unchangedCount: integer("unchanged_count").notNull().default(0),
    // Sites deleted (unseen for 30 days or merged into an older one), agencies made inactive.
    removedCount: integer("removed_count").notNull().default(0),
    discardedCount: integer("discarded_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    // Error messages of the run; may keep fewer than errorCount if the pipeline caps them.
    errors: jsonb("errors").$type<string[]>().notNull().default([]),
  },
  (t) => [
    check(
      "ingest_runs_counts_non_negative",
      sql`${t.createdCount} >= 0 AND ${t.updatedCount} >= 0 AND ${t.unchangedCount} >= 0
        AND ${t.removedCount} >= 0 AND ${t.discardedCount} >= 0 AND ${t.errorCount} >= 0`,
    ),
    check("ingest_runs_source_format", sql`${t.source} ~ '^[a-z][a-z0-9-]*$'`),
    check("ingest_runs_errors_array", sql`jsonb_typeof(${t.errors}) = 'array'`),
    // Finished runs have an end after the start; written with IS NULL guards, since a NULL
    // comparison would make the check pass.
    check(
      "ingest_runs_finished_valid",
      sql`CASE ${t.status}
        WHEN 'running' THEN ${t.finishedAt} IS NULL
        ELSE ${t.finishedAt} IS NOT NULL AND ${t.finishedAt} >= ${t.startedAt}
      END`,
    ),
  ],
).enableRLS();
