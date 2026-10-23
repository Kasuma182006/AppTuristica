CREATE TABLE "departments" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(2) NOT NULL,
	"name" text NOT NULL,
	"geom" geometry(MultiPolygon, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code"),
	CONSTRAINT "departments_code_format" CHECK ("departments"."code" ~ '^[0-9]{2}$'),
	CONSTRAINT "departments_geom_valid" CHECK (ST_IsValid("departments"."geom"))
);
--> statement-breakpoint
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;