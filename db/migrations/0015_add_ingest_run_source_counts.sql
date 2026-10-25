ALTER TABLE "ingest_runs" DROP CONSTRAINT "ingest_runs_counts_non_negative";--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD COLUMN "source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD COLUMN "unchanged_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD COLUMN "removed_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD CONSTRAINT "ingest_runs_source_format" CHECK ("ingest_runs"."source" ~ '^[a-z][a-z0-9-]*$');--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD CONSTRAINT "ingest_runs_counts_non_negative" CHECK ("ingest_runs"."created_count" >= 0 AND "ingest_runs"."updated_count" >= 0 AND "ingest_runs"."unchanged_count" >= 0
        AND "ingest_runs"."removed_count" >= 0 AND "ingest_runs"."discarded_count" >= 0 AND "ingest_runs"."error_count" >= 0);