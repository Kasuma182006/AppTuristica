import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./index";

const exports: Record<string, unknown> = schema;
const tables = Object.values(exports).filter((value): value is PgTable => is(value, PgTable));

describe("database schema", () => {
  it("exports at least one table", () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables.map((table) => [getTableConfig(table).name, table] as const))(
    "enables row level security on %s",
    (_name, table) => {
      expect(getTableConfig(table).enableRLS).toBe(true);
    },
  );
});
