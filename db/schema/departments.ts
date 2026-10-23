import { sql } from "drizzle-orm";
import { check, pgTable, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { multiPolygon } from "./geometry";

// Colombian departments (HU-09). Bounds the geographic scope of every place and site.
export const departments = pgTable(
  "departments",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    // DIVIPOLA department code (DANE): two digits, leading zeros kept (e.g. "05", "76").
    code: varchar("code", { length: 2 }).notNull().unique(),
    name: text("name").notNull(),
    geom: multiPolygon("geom").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("departments_code_format", sql`${t.code} ~ '^[0-9]{2}$'`),
    check("departments_geom_valid", sql`ST_IsValid(${t.geom})`),
  ],
).enableRLS();
