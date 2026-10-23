import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, primaryKey, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { placeTypes, type OsmTagSelector } from "./place-types";

// Activities (HU-12): the "Actividad" filter. Ingest derives a site's activities from its type
// (place_type_activities) and from its OSM tags (osm_tags); the community picks them by hand.
export const activities = pgTable(
  "activities",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    // Spanish, used in URLs and API filters (?actividad=senderismo).
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    // Display order (ties: by id).
    sortOrder: smallint("sort_order").notNull(),
    // Derivation rule: a site gets the activity when its OSM tags match any selector.
    // Empty when the activity is only derived from types or chosen by the community.
    osmTags: jsonb("osm_tags").$type<OsmTagSelector[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("activities_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("activities_osm_tags_array", sql`jsonb_typeof(${t.osmTags}) = 'array'`),
  ],
).enableRLS();

// Derivation rule: every site of the type gets the activity (e.g. sendero → senderismo).
export const placeTypeActivities = pgTable(
  "place_type_activities",
  {
    placeTypeId: smallint("place_type_id")
      .notNull()
      .references(() => placeTypes.id, { onDelete: "cascade" }),
    activityId: smallint("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.placeTypeId, t.activityId] })],
).enableRLS();
