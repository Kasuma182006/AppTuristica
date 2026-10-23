CREATE TYPE "public"."place_cost" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TYPE "public"."place_difficulty" AS ENUM('easy', 'moderate', 'hard');--> statement-breakpoint
CREATE TYPE "public"."place_origin" AS ENUM('open_data', 'community');--> statement-breakpoint
CREATE TYPE "public"."place_sensitivity" AS ENUM('normal', 'fragile');--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TABLE "places" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "places_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"place_type_id" smallint NOT NULL,
	"municipality_id" smallint NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"description" text,
	"difficulty" "place_difficulty",
	"altitude_m" integer,
	"cost" "place_cost",
	"sensitivity" "place_sensitivity" DEFAULT 'normal' NOT NULL,
	"in_protected_area" boolean DEFAULT false NOT NULL,
	"private_property" boolean DEFAULT false NOT NULL,
	"origin" "place_origin" NOT NULL,
	"confidence" smallint DEFAULT 0 NOT NULL,
	"status" "place_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug"),
	CONSTRAINT "places_slug_format" CHECK ("places"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "places_name_not_blank" CHECK (btrim("places"."name") <> ''),
	CONSTRAINT "places_description_not_blank" CHECK (btrim("places"."description") <> ''),
	CONSTRAINT "places_altitude_range" CHECK ("places"."altitude_m" BETWEEN -500 AND 9000),
	CONSTRAINT "places_confidence_range" CHECK ("places"."confidence" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_place_type_id_place_types_id_fk" FOREIGN KEY ("place_type_id") REFERENCES "public"."place_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;