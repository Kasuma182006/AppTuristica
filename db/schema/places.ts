import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { point } from "./geometry";
import { municipalities } from "./municipalities";
import { placeTypes } from "./place-types";

// Unknown values ("sin dato") are NULL in the nullable enums below.
export const difficultyEnum = pgEnum("place_difficulty", ["easy", "moderate", "hard"]);
export const costEnum = pgEnum("place_cost", ["free", "paid"]);
export const sensitivityEnum = pgEnum("place_sensitivity", ["normal", "fragile"]);
export const originEnum = pgEnum("place_origin", ["open_data", "community"]);
export const statusEnum = pgEnum("place_status", ["published", "hidden"]);

// Tourist sites (HU-13), named `places` like the module and the API (/api/v1/places).
// The municipality is assigned by geography; a trigger rejects locations outside it
// (see migration 0006_place_location_in_municipality).
export const places = pgTable(
  "places",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // Used in /sitio/{slug}.
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    placeTypeId: smallint("place_type_id")
      .notNull()
      .references(() => placeTypes.id, { onDelete: "restrict" }),
    municipalityId: smallint("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "restrict" }),
    // Exact location: never exposed for fragile sites.
    location: point("location").notNull(),
    // Generated from templates or written by the community; never copied from third parties.
    description: text("description"),
    difficulty: difficultyEnum("difficulty"),
    altitudeM: integer("altitude_m"),
    cost: costEnum("cost"),
    sensitivity: sensitivityEnum("sensitivity").notNull().default("normal"),
    // Access restrictions, detected from OSM (HU-25).
    inProtectedArea: boolean("in_protected_area").notNull().default(false),
    privateProperty: boolean("private_property").notNull().default(false),
    origin: originEnum("origin").notNull(),
    // 0–100, from number of sources and completeness (HU-30).
    confidence: smallint("confidence").notNull().default(0),
    // Hidden sites (3 reports) never appear in any response, count or sitemap.
    status: statusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("places_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("places_name_not_blank", sql`btrim(${t.name}) <> ''`),
    check("places_description_not_blank", sql`btrim(${t.description}) <> ''`),
    check("places_altitude_range", sql`${t.altitudeM} BETWEEN -500 AND 9000`),
    check("places_confidence_range", sql`${t.confidence} BETWEEN 0 AND 100`),
  ],
).enableRLS();
