CREATE INDEX "places_location_idx" ON "places" USING gist ("location");--> statement-breakpoint
CREATE INDEX "places_municipality_id_idx" ON "places" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "places_place_type_id_idx" ON "places" USING btree ("place_type_id");--> statement-breakpoint
CREATE INDEX "places_status_idx" ON "places" USING btree ("status");--> statement-breakpoint
CREATE INDEX "place_activities_activity_id_idx" ON "place_activities" USING btree ("activity_id");