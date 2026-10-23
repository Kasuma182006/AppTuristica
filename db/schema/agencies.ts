import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { municipalities } from "./municipalities";

export const agencyStatusEnum = pgEnum("agency_status", ["active", "inactive"]);

// Travel agencies from the Registro Nacional de Turismo (HU-17), listed on site pages of their
// municipality (RF-16) without implying a recommendation. Businesses only: tour guides are
// individuals, so their contact data is personal (Ley 1581) and not imported.
export const agencies = pgTable(
  "agencies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // RNT registration number; ingest updates agencies by it (HU-32).
    rntNumber: integer("rnt_number").notNull().unique(),
    name: text("name").notNull(),
    municipalityId: smallint("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "restrict" }),
    // Business contact as published in the RNT, normalized by ingest.
    phone: text("phone"),
    email: text("email"),
    // Inactive when the RNT no longer lists it as active; hidden from site pages.
    status: agencyStatusEnum("status").notNull().default("active"),
    // Last ingest run that still found it in the RNT.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("agencies_rnt_number_positive", sql`${t.rntNumber} > 0`),
    check("agencies_name_not_blank", sql`btrim(${t.name}) <> ''`),
    // Digits with optional leading +, as normalized by ingest (e.g. "3001234567", "+5726012345").
    check("agencies_phone_format", sql`${t.phone} ~ '^\\+?[0-9]{7,15}$'`),
    check(
      "agencies_email_format",
      sql`${t.email} ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'`,
    ),
  ],
).enableRLS();
