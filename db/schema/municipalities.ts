import { sql } from "drizzle-orm";
import { check, pgTable, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { departments } from "./departments";
import { multiPolygon } from "./geometry";

// Municipalities (HU-10): the "Lugar" filter in the UI. Named `municipalities` in code because
// `places` is the tourist sites module and API (/api/v1/places).
export const municipalities = pgTable(
  "municipalities",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    // DIVIPOLA municipality code (DANE): five digits, the first two are the department's.
    code: varchar("code", { length: 5 }).notNull().unique(),
    name: text("name").notNull(),
    // Unique across departments: used in /lugar/{slug} and API filters.
    slug: text("slug").notNull().unique(),
    departmentId: smallint("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    geom: multiPolygon("geom").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("municipalities_code_format", sql`${t.code} ~ '^[0-9]{5}$'`),
    check("municipalities_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("municipalities_geom_valid", sql`ST_IsValid(${t.geom})`),
  ],
).enableRLS();
