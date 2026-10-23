CREATE TYPE "public"."photo_source" AS ENUM('wikimedia_commons');--> statement-breakpoint
CREATE TABLE "photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"url" text NOT NULL,
	"author" text NOT NULL,
	"license" text NOT NULL,
	"license_url" text,
	"source" "photo_source" NOT NULL,
	"source_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_place_url_unique" UNIQUE("place_id","url"),
	CONSTRAINT "photos_author_not_blank" CHECK (btrim("photos"."author") <> ''),
	CONSTRAINT "photos_license_not_blank" CHECK (btrim("photos"."license") <> ''),
	CONSTRAINT "photos_license_url_https" CHECK ("photos"."license_url" ~ '^https://'),
	CONSTRAINT "photos_commons_urls" CHECK ("photos"."source" <> 'wikimedia_commons' OR (
        "photos"."url" ~ '^https://upload\.wikimedia\.org/'
        AND "photos"."source_url" ~ '^https://commons\.wikimedia\.org/')),
	CONSTRAINT "photos_size_valid" CHECK (("photos"."width" IS NULL AND "photos"."height" IS NULL)
        OR ("photos"."width" IS NOT NULL AND "photos"."height" IS NOT NULL AND "photos"."width" > 0 AND "photos"."height" > 0))
);
--> statement-breakpoint
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;