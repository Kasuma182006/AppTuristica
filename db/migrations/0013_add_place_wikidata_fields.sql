ALTER TABLE "places" ADD COLUMN "wikidata_description" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "wikipedia_url" text;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_wikidata_description_not_blank" CHECK (btrim("places"."wikidata_description") <> '');--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_wikipedia_url_format" CHECK ("places"."wikipedia_url" ~ '^https://es\.wikipedia\.org/wiki/.+');