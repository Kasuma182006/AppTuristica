import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

export type IngestDb = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

/** Opens the long-lived connection used by ingest (Supabase session pooler, see .env.example). */
export function connectIngestDb(): { db: IngestDb; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) throw new Error("DATABASE_URL_DIRECT is not set (see .env.example)");

  const client = postgres(url, { max: 1, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
