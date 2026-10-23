import { fileURLToPath } from "node:url";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type * as schema from "@db/schema";

// A database or transaction: seeds run inside one transaction (see index.ts).
export type SeedDb = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

export interface SeedResult {
  inserted: string[];
  updated: string[];
  unchanged: string[];
}

export function emptySeedResult(): SeedResult {
  return { inserted: [], updated: [], unchanged: [] };
}

/** Records an upsert outcome; `rows` comes from `.returning({ inserted: sql`(xmax = 0)` })`. */
export function recordUpsert(result: SeedResult, code: string, rows: { inserted: boolean }[]) {
  const row = rows[0];
  if (!row) result.unchanged.push(code);
  else if (row.inserted) result.inserted.push(code);
  else result.updated.push(code);
}

export function formatSeedResult(label: string, result: SeedResult): string {
  return (
    `${label}: ${result.inserted.length} inserted, ` +
    `${result.updated.length} updated, ${result.unchanged.length} unchanged`
  );
}

const DATA_DIR = new URL("./data/", import.meta.url);

/** Path of a committed boundary file, e.g. `boundaryPath("municipalities", "76")`. */
export function boundaryPath(kind: "departments" | "municipalities", code: string): string {
  return fileURLToPath(new URL(`${kind}/${code}.geojson`, DATA_DIR));
}
