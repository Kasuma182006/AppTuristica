CREATE TABLE "activities" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" smallint NOT NULL,
	"osm_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "activities_slug_format" CHECK ("activities"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "activities_osm_tags_array" CHECK (jsonb_typeof("activities"."osm_tags") = 'array')
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "place_type_activities" (
	"place_type_id" smallint NOT NULL,
	"activity_id" smallint NOT NULL,
	CONSTRAINT "place_type_activities_place_type_id_activity_id_pk" PRIMARY KEY("place_type_id","activity_id")
);
--> statement-breakpoint
ALTER TABLE "place_type_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "place_type_activities" ADD CONSTRAINT "place_type_activities_place_type_id_place_types_id_fk" FOREIGN KEY ("place_type_id") REFERENCES "public"."place_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_type_activities" ADD CONSTRAINT "place_type_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;