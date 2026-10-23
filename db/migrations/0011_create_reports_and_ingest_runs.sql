CREATE TYPE "public"."report_reason" AS ENUM('not_exists', 'wrong_location', 'false_info', 'inappropriate', 'dangerous');--> statement-breakpoint
CREATE TYPE "public"."ingest_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"reason" "report_reason" NOT NULL,
	"comment" text,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_place_ip_hash_unique" UNIQUE("place_id","ip_hash"),
	CONSTRAINT "reports_comment_valid" CHECK (btrim("reports"."comment") <> '' AND char_length("reports"."comment") <= 1000),
	CONSTRAINT "reports_ip_hash_format" CHECK ("reports"."ip_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingest_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingest_run_status" DEFAULT 'running' NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"discarded_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "ingest_runs_counts_non_negative" CHECK ("ingest_runs"."created_count" >= 0 AND "ingest_runs"."updated_count" >= 0
        AND "ingest_runs"."discarded_count" >= 0 AND "ingest_runs"."error_count" >= 0),
	CONSTRAINT "ingest_runs_errors_array" CHECK (jsonb_typeof("ingest_runs"."errors") = 'array'),
	CONSTRAINT "ingest_runs_finished_valid" CHECK (CASE "ingest_runs"."status"
        WHEN 'running' THEN "ingest_runs"."finished_at" IS NULL
        ELSE "ingest_runs"."finished_at" IS NOT NULL AND "ingest_runs"."finished_at" >= "ingest_runs"."started_at"
      END)
);
--> statement-breakpoint
ALTER TABLE "ingest_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;