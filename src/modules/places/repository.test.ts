import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import * as schema from "@db/schema";
import type { Db } from "@/lib/db";
import {
  countPlaces,
  countPlacesByActivity,
  countPlacesByDifficulty,
  countPlacesByMunicipality,
  countPlacesByOrigin,
  countPlacesByPlaceType,
  countRestrictedPlaces,
  findPlaceBySlug,
  findPlaces,
} from "./repository";
import type { PlaceFilters, PlaceQuery } from "./types";

interface LoggedQuery {
  sql: string;
  params: unknown[];
}

/**
 * Runs a repository call against a database without a connection and returns the queries it
 * sent. The first query fails (nothing answers it), so only queries sent up to then are logged.
 */
async function sentQueries(call: (db: Db) => Promise<unknown>): Promise<LoggedQuery[]> {
  const queries: LoggedQuery[] = [];
  const db = drizzle.mock({
    schema,
    logger: { logQuery: (sql, params) => queries.push({ sql, params }) },
  });
  await call(db as unknown as Db).catch(() => undefined);
  return queries;
}

/** The `where` clause of a query, up to its order or limit. */
function whereClause(sql: string): string {
  const where = sql.slice(sql.indexOf(" where ") + " where ".length);
  return where.split(/ order by | limit /)[0] ?? where;
}

/** The where clause without its nested groups, e.g. "(a and (b or c))" → "a and ". */
function topLevelTerms(where: string): string {
  if (!where.startsWith("(")) return where;
  let depth = 0;
  let terms = "";
  for (const char of where) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (depth === 1) terms += char;
  }
  return terms;
}

/**
 * True when every row must have `status = 'published'`: the condition is a top-level AND term
 * (Drizzle renders and(a, b) as "(a and b)"), not inside an OR that would let hidden sites in.
 * Queries on `places` alone render the column without its table.
 */
function requiresPublished({ sql, params }: LoggedQuery): boolean {
  const terms = topLevelTerms(whereClause(sql));
  const onlyPlaces = /^select .* from "places"(?! (?:inner |left )?join)/.test(sql);
  const column = onlyPlaces ? /(?:"places"\.)?"status" = \$(\d+)/ : /"places"\."status" = \$(\d+)/;
  const match = column.exec(terms);
  return !terms.includes(" or ") && params[Number(match?.[1]) - 1] === "published";
}

const query = (filters: Partial<PlaceFilters> = {}): PlaceQuery => ({
  filters: { freeAccessOnly: false, ...filters },
  sort: "confianza",
  page: 1,
  pageSize: 24,
});

describe("hidden sites never appear (HU-40)", () => {
  const filterCases: [string, Partial<PlaceFilters>][] = [
    ["no filters", {}],
    ["lugar", { municipality: "dagua" }],
    ["tipo", { placeTypes: ["cascada", "rio"] }],
    ["actividad", { activities: ["senderismo"] }],
    ["dificultad", { difficulties: ["easy", null] }],
    ["sin dato only", { difficulties: [null] }],
    ["origen", { origins: ["community"] }],
    ["acceso", { freeAccessOnly: true }],
    [
      "every filter",
      {
        municipality: "dagua",
        placeTypes: ["cascada"],
        activities: ["senderismo", "fotografia"],
        difficulties: ["moderate", null],
        origins: ["open_data", "community"],
        freeAccessOnly: true,
      },
    ],
  ];

  it.each(filterCases)("search results and their count with %s", async (_label, filters) => {
    const queries = await sentQueries((db) => findPlaces(db, query(filters)));
    const [count, page] = queries;

    expect(queries).toHaveLength(2);
    expect(count?.sql).toMatch(/^select count\(\*\) from "places"/);
    expect(page?.sql).toMatch(/ from "places" /);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it.each(filterCases)("the result count alone with %s (HU-55)", async (_label, filters) => {
    const queries = await sentQueries((db) =>
      countPlaces(db, { freeAccessOnly: false, ...filters }),
    );

    expect(queries).toHaveLength(1);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the site page", async () => {
    const queries = await sentQueries((db) => findPlaceBySlug(db, "rio-cali"));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.params).toContain("rio-cali");
    expect(queries.every(requiresPublished)).toBe(true);
  });
});

describe("sort orders (HU-37, HU-53)", () => {
  it.each([
    ["confianza", /^"places"\."confidence" desc, "places"\."name" asc, "places"\."id" asc$/],
    [
      "recientes",
      /^date_trunc\('day', "places"\."created_at" at time zone 'America\/Bogota'\) desc, "places"\."confidence" desc, "places"\."name" asc, "places"\."id" asc$/,
    ],
    ["alfabetico", /^"places"\."name" asc, "places"\."id" asc$/],
  ] as const)("%s", async (sort, expected) => {
    const [, page] = await sentQueries((db) => findPlaces(db, { ...query(), sort }));
    const orderBy = page?.sql.split(" order by ")[1]?.split(" limit ")[0];

    expect(orderBy).toMatch(expected);
  });
});

describe("hidden sites are not counted (HU-40, HU-44)", () => {
  it("the site count per municipality", async () => {
    const queries = await sentQueries((db) => countPlacesByMunicipality(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(/^select "municipalities"\."slug", count\(\*\) from "places"/);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the site count per place type", async () => {
    const queries = await sentQueries((db) => countPlacesByPlaceType(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(/^select "place_types"\."slug", count\(\*\) from "places"/);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the site count per activity", async () => {
    const queries = await sentQueries((db) => countPlacesByActivity(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(
      /^select "activities"\."slug", count\(\*\) from "place_activities"/,
    );
    expect(queries[0]?.sql).toContain('inner join "places"');
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the site count per difficulty", async () => {
    const queries = await sentQueries((db) => countPlacesByDifficulty(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(/^select "difficulty", count\(\*\) from "places" where/);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the site count per origin", async () => {
    const queries = await sentQueries((db) => countPlacesByOrigin(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toMatch(/^select "origin", count\(\*\) from "places" where/);
    expect(queries.every(requiresPublished)).toBe(true);
  });

  it("the count of sites with restricted access", async () => {
    const queries = await sentQueries((db) => countRestrictedPlaces(db));

    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toContain(
      '("places"."in_protected_area" = $2 or "places"."private_property" = $3)',
    );
    expect(queries.every(requiresPublished)).toBe(true);
  });
});

describe("requiresPublished", () => {
  const check = (sql: string, params: unknown[] = ["published"]) =>
    requiresPublished({ sql, params });

  it("accepts the condition alone or ANDed with others", () => {
    expect(check(`select 1 from "places" where "places"."status" = $1 limit $2`)).toBe(true);
    expect(
      check(`select 1 from "places" where ("places"."slug" = $1 and "places"."status" = $2)`, [
        "rio-cali",
        "published",
      ]),
    ).toBe(true);
    expect(
      check(
        `select 1 from "places" where ("places"."status" = $1 and ("places"."difficulty" in ($2) or "places"."difficulty" is null))`,
        ["published", "easy"],
      ),
    ).toBe(true);
  });

  it("rejects a missing condition, another status or an OR around it", () => {
    expect(check(`select 1 from "places" where "places"."slug" = $1`, ["rio-cali"])).toBe(false);
    expect(check(`select 1 from "places" where "places"."status" = $1`, ["hidden"])).toBe(false);
    expect(
      check(`select 1 from "places" where ("places"."status" = $1 or "places"."slug" = $2)`, [
        "published",
        "rio-cali",
      ]),
    ).toBe(false);
  });
});
