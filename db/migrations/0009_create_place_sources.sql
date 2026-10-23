CREATE TYPE "public"."place_source" AS ENUM('openstreetmap', 'wikidata', 'community');--> statement-breakpoint
CREATE TABLE "place_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"source" "place_source" NOT NULL,
	"external_id" text,
	"url" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_sources_source_external_id_unique" UNIQUE("source","external_id"),
	CONSTRAINT "place_sources_external_id_format" CHECK (CASE "place_sources"."source"
        WHEN 'openstreetmap' THEN "place_sources"."external_id" IS NOT NULL AND "place_sources"."external_id" ~ '^(node|way|relation)/[1-9][0-9]*$'
        WHEN 'wikidata' THEN "place_sources"."external_id" IS NOT NULL AND "place_sources"."external_id" ~ '^Q[1-9][0-9]*$'
        WHEN 'community' THEN "place_sources"."external_id" IS NULL
      END),
	CONSTRAINT "place_sources_url" CHECK (CASE "place_sources"."source"
        WHEN 'community' THEN "place_sources"."url" IS NULL
        ELSE "place_sources"."url" IS NOT NULL AND "place_sources"."url" ~ '^https://'
      END)
);
--> statement-breakpoint
ALTER TABLE "place_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;