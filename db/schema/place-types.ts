import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

/**
 * OSM tags an element must all have to match, e.g. `{ highway: "path", sac_scale: "*" }`.
 * The value "*" means the key must be present with any value.
 */
export type OsmTagSelector = Record<string, string>;

// Place types (HU-11): the "Tipo" filter, and how ingest classifies OSM elements.
export const placeTypes = pgTable(
  "place_types",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    // Spanish, used in URLs and API filters (?tipo=cascada).
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    // Display order; also the priority when an OSM element matches several types (ties: by id).
    sortOrder: smallint("sort_order").notNull(),
    // An element matches the type when it matches any selector.
    osmTags: jsonb("osm_tags").$type<OsmTagSelector[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("place_types_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "place_types_osm_tags_not_empty",
      sql`jsonb_typeof(${t.osmTags}) = 'array' AND jsonb_array_length(${t.osmTags}) > 0`,
    ),
  ],
).enableRLS();
