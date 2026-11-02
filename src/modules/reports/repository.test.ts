import { PgDialect } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";
import * as schema from "@db/schema";
import type { Db } from "@/lib/db";
import {
  deleteExpiredReports,
  saveReport,
  saveReportStatement,
  type NewReport,
} from "./repository";

const HASH = "a".repeat(64);

const report: NewReport = {
  placeSlug: "embalse-de-calima",
  reason: "wrong_location",
  comment: "El punto está al otro lado del lago.",
  ipHash: HASH,
};

const { sql, params } = new PgDialect().sqlToQuery(saveReportStatement(report));

describe("saveReportStatement", () => {
  it("only reports a published site, so a hidden one gets nothing", () => {
    const where = /WHERE (.*)[)]/.exec(sql.replace(/\s+/g, " "))?.[1] ?? "";
    const status = /"places"."status" = [$]([0-9]+)/.exec(where);

    expect(params[Number(status?.[1]) - 1]).toBe("published");
    expect(where).toContain(" AND ");
    expect(where.toUpperCase()).not.toContain(" OR ");
  });

  it("ignores another report of the same IP on the same site", () => {
    expect(sql).toContain("ON CONFLICT (place_id, ip_hash) DO NOTHING");
  });

  it("is a single statement", () => {
    expect(sql.match(/INSERT INTO/g)).toHaveLength(1);
    expect(sql).not.toMatch(/;\s*\S/);
  });

  it("sends what was written as parameters, never inside the SQL", () => {
    expect(params).toEqual([
      "embalse-de-calima",
      "published",
      "wrong_location",
      "El punto está al otro lado del lago.",
      HASH,
    ]);
    expect(sql).not.toContain("otro lado");
  });

  it("sends no comment as an empty value", () => {
    const empty = new PgDialect().sqlToQuery(saveReportStatement({ ...report, comment: null }));

    expect(empty.params).toContain(null);
  });
});

describe("deleteExpiredReports", () => {
  const deletedWith = async (now: Date) => {
    const queries: { sql: string; params: unknown[] }[] = [];
    const db = drizzle.mock({
      schema,
      logger: { logQuery: (text, values) => queries.push({ sql: text, params: values }) },
    });
    await deleteExpiredReports(db as unknown as Db, now).catch(() => undefined);
    return queries;
  };

  it("deletes the whole report once its time has passed, whatever its site", async () => {
    const queries = await deletedWith(new Date("2026-11-02T12:00:00Z"));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(
      /^delete from "reports" where "reports"."created_at" <= [$]1 returning/,
    );
    // 180 days before.
    expect(queries[0]?.params).toEqual(["2026-05-06T12:00:00.000Z"]);
  });
});

describe("saveReport", () => {
  const dbReturning = (rows: unknown[]) => ({ execute: vi.fn(async () => rows) }) as unknown as Db;

  it("is true when the site is published, also when the report was already there", async () => {
    await expect(saveReport(dbReturning([{ id: 7 }]), report)).resolves.toBe(true);
  });

  it("is false when the site is hidden or does not exist", async () => {
    await expect(saveReport(dbReturning([]), report)).resolves.toBe(false);
  });
});
