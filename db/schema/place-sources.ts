import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { places } from "./places";

// Where a site's data comes from. Commons is a photo source (photos table), RNT feeds agencies.
export const placeSourceEnum = pgEnum("place_source", ["openstreetmap", "wikidata", "community"]);

// Sources of each site (HU-16), shown with links on the site page (RF-15) and counted by the
// confidence score. A site may have several (e.g. an OSM node merged with its Wikidata item).
export const placeSources = pgTable(
  "place_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    source: placeSourceEnum("source").notNull(),
    // OSM "node/123" | "way/123" | "relation/123", Wikidata "Q123"; none for community proposals.
    externalId: text("external_id"),
    url: text("url"),
    // Last ingest run that still found the element; the site page shows it as the update date.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Global, not per site: an external element belongs to one site, which keeps ingest
    // idempotent (it finds the site by its external id instead of creating a duplicate).
    unique("place_sources_source_external_id_unique").on(t.source, t.externalId),
    // IS NOT NULL guards: a NULL comparison would make the check pass.
    check(
      "place_sources_external_id_format",
      sql`CASE ${t.source}
        WHEN 'openstreetmap' THEN ${t.externalId} IS NOT NULL AND ${t.externalId} ~ '^(node|way|relation)/[1-9][0-9]*$'
        WHEN 'wikidata' THEN ${t.externalId} IS NOT NULL AND ${t.externalId} ~ '^Q[1-9][0-9]*$'
        WHEN 'community' THEN ${t.externalId} IS NULL
      END`,
    ),
    check(
      "place_sources_url",
      sql`CASE ${t.source}
        WHEN 'community' THEN ${t.url} IS NULL
        ELSE ${t.url} IS NOT NULL AND ${t.url} ~ '^https://'
      END`,
    ),
  ],
).enableRLS();
