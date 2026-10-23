CREATE TABLE "place_activities" (
	"place_id" integer NOT NULL,
	"activity_id" smallint NOT NULL,
	CONSTRAINT "place_activities_place_id_activity_id_pk" PRIMARY KEY("place_id","activity_id")
);
--> statement-breakpoint
ALTER TABLE "place_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "place_activities" ADD CONSTRAINT "place_activities_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_activities" ADD CONSTRAINT "place_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;