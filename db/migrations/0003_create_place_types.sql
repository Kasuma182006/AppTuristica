CREATE TABLE "place_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" smallint NOT NULL,
	"osm_tags" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_types_slug_unique" UNIQUE("slug"),
	CONSTRAINT "place_types_slug_format" CHECK ("place_types"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "place_types_osm_tags_not_empty" CHECK (jsonb_typeof("place_types"."osm_tags") = 'array' AND jsonb_array_length("place_types"."osm_tags") > 0)
);
--> statement-breakpoint
ALTER TABLE "place_types" ENABLE ROW LEVEL SECURITY;