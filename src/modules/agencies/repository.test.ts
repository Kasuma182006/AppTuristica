import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import * as schema from "@db/schema";
import type { Db } from "@/lib/db";
import { countActiveAgencies, findRandomActiveAgencies } from "./repository";

interface LoggedQuery {
  sql: string;
  params: unknown[];
}

/** The queries a repository call sends to a database without a connection. */
async function sentQueries(call: (db: Db) => Promise<unknown>): Promise<LoggedQuery[]> {
  const queries: LoggedQuery[] = [];
  const db = drizzle.mock({
    schema,
    logger: { logQuery: (sql, params) => queries.push({ sql, params }) },
  });
  await call(db as unknown as Db).catch(() => undefined);
  return queries;
}

/** True when the query keeps only active agencies of the municipality, both as AND terms. */
function activeInMunicipality({ sql, params }: LoggedQuery): boolean {
  const where = sql.slice(sql.indexOf(" where ")).split(/ order by | limit /)[0] ?? "";
  const status = /"agencies"\."status" = \$(\d+)/.exec(where);
  const slug = /"municipalities"\."slug" = \$(\d+)/.exec(where);
  return (
    !where.includes(" or ") &&
    params[Number(status?.[1]) - 1] === "active" &&
    params[Number(slug?.[1]) - 1] === "cali"
  );
}

describe("agencies of a municipality (HU-66)", () => {
  it("counts only active agencies", async () => {
    const [query] = await sentQueries((db) => countActiveAgencies(db, "cali"));

    expect(query?.sql).toMatch(/^select count\(\*\) from "agencies"/);
    expect(query && activeInMunicipality(query)).toBe(true);
  });

  it("lists active agencies only, contact first, in random order, up to the limit", async () => {
    const [query] = await sentQueries((db) => findRandomActiveAgencies(db, "cali", 6));

    expect(query && activeInMunicipality(query)).toBe(true);
    expect(query?.sql).toMatch(
      /order by \("agencies"\."phone" is null and "agencies"\."email" is null\) asc, random\(\) limit \$\d+$/,
    );
    expect(query?.params.at(-1)).toBe(6);
  });

  it("never selects the agency's status, dates or internal id", async () => {
    const [query] = await sentQueries((db) => findRandomActiveAgencies(db, "cali", 6));
    const columns = query?.sql.slice(0, query.sql.indexOf(" from ")) ?? "";

    expect(columns).not.toMatch(/"id"|"status"|_at"/);
  });
});
