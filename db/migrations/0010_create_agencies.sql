CREATE TYPE "public"."agency_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"rnt_number" integer NOT NULL,
	"name" text NOT NULL,
	"municipality_id" smallint NOT NULL,
	"phone" text,
	"email" text,
	"status" "agency_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agencies_rnt_number_unique" UNIQUE("rnt_number"),
	CONSTRAINT "agencies_rnt_number_positive" CHECK ("agencies"."rnt_number" > 0),
	CONSTRAINT "agencies_name_not_blank" CHECK (btrim("agencies"."name") <> ''),
	CONSTRAINT "agencies_phone_format" CHECK ("agencies"."phone" ~ '^\+?[0-9]{7,15}$'),
	CONSTRAINT "agencies_email_format" CHECK ("agencies"."email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
--> statement-breakpoint
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;