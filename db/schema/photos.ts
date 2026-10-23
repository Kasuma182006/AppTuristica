import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { places } from "./places";

// Only Wikimedia Commons photos are allowed (CLAUDE.md: never third-party photos).
// Proposals carry no photos; a new source needs a migration and a legal review.
export const photoSourceEnum = pgEnum("photo_source", ["wikimedia_commons"]);

// Site photos (HU-15) with the attribution shown under each one (RF-11).
// Sites without photos show a generic image of their type instead (HU-60).
export const photos = pgTable(
  "photos",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    placeId: integer("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    // Image file served by the source (e.g. upload.wikimedia.org).
    url: text("url").notNull(),
    author: text("author").notNull(),
    // License name as given by the source, e.g. "CC BY-SA 4.0".
    license: text("license").notNull(),
    licenseUrl: text("license_url"),
    source: photoSourceEnum("source").notNull(),
    // Page of the file at the source, linked from the attribution.
    sourceUrl: text("source_url").notNull(),
    // Pixel size, when known, so images can be laid out without shifting.
    width: integer("width"),
    height: integer("height"),
    // Gallery order; the first photo is the site's cover.
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("photos_place_url_unique").on(t.placeId, t.url),
    check("photos_author_not_blank", sql`btrim(${t.author}) <> ''`),
    check("photos_license_not_blank", sql`btrim(${t.license}) <> ''`),
    check("photos_license_url_https", sql`${t.licenseUrl} ~ '^https://'`),
    check(
      "photos_commons_urls",
      sql`${t.source} <> 'wikimedia_commons' OR (
        ${t.url} ~ '^https://upload\\.wikimedia\\.org/'
        AND ${t.sourceUrl} ~ '^https://commons\\.wikimedia\\.org/')`,
    ),
    check(
      "photos_size_valid",
      // Both or neither; written without NULL comparisons, which would make the check pass.
      sql`(${t.width} IS NULL AND ${t.height} IS NULL)
        OR (${t.width} IS NOT NULL AND ${t.height} IS NOT NULL AND ${t.width} > 0 AND ${t.height} > 0)`,
    ),
  ],
).enableRLS();
