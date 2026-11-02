import { lte, sql, type SQL } from "drizzle-orm";
import { places, reports } from "@db/schema";
import type { Db } from "@/lib/db";
import { isPublished } from "@/modules/places/repository";
import { REPORT_RETENTION_DAYS, type ReportReason } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A report ready to save. The IP only as its keyed hash (RNF-05). */
export interface NewReport {
  placeSlug: string;
  reason: ReportReason;
  comment: string | null;
  ipHash: string;
}

/**
 * Saves a report on a published site and returns that site, or nothing if there is none. The same
 * IP reporting the same site again saves nothing and is not an error, so nobody can hide a site
 * alone (HU-85, reports_place_ip_hash_unique). One statement, because db.transaction does not work with the
 * app's client (see src/lib/db.ts).
 */
export function saveReportStatement(report: NewReport): SQL {
  return sql`
    WITH target AS (
      SELECT ${places.id} AS id
      FROM ${places}
      WHERE ${places.slug} = ${report.placeSlug} AND ${isPublished}
    ),
    saved AS (
      INSERT INTO reports (place_id, reason, comment, ip_hash)
      SELECT target.id, ${report.reason}::report_reason, ${report.comment}::text, ${report.ipHash}::text
      FROM target
      ON CONFLICT (place_id, ip_hash) DO NOTHING
    )
    SELECT id FROM target
  `;
}

/** Whether the site could be reported: false when it is hidden or does not exist. */
export async function saveReport(db: Db, report: NewReport): Promise<boolean> {
  const rows = await db.execute(saveReportStatement(report));
  return rows.length > 0;
}

/**
 * Deletes the reports past their time (HU-85, RNF-05) and returns how many. The whole report goes,
 * not just the hash: a report that stayed without it would still count, and the same IP could
 * report again, until it hid the site alone.
 */
export async function deleteExpiredReports(
  db: Pick<Db, "delete">,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - REPORT_RETENTION_DAYS * DAY_MS);
  const deleted = await db
    .delete(reports)
    .where(lte(reports.createdAt, cutoff))
    .returning({ id: reports.id });
  return deleted.length;
}
