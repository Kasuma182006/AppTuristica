import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

export type Db = ReturnType<typeof createDb>;

// Reuse the client across hot reloads in development to avoid exhausting connections.
const globalForDb = globalThis as unknown as { db?: Db };

/** postgres.js reads `max_pipeline` (default 100) but leaves it out of its types. */
type ClientOptions = postgres.Options<Record<string, never>> & { max_pipeline: number };

const clientOptions: ClientOptions = {
  // Supabase transaction pooler does not support prepared statements.
  prepare: false,
  // Never queue a query behind another on a busy connection: through the transaction pooler
  // those connections stop answering, and from then on every page hangs until the
  // statement_timeout (HU-51: six simultaneous requests were enough). Extra queries wait for a
  // free connection instead.
  max_pipeline: 0,
};

function createDb(url: string) {
  return drizzle(postgres(url, clientOptions), { schema });
}

/**
 * The web app and API database (Supabase transaction pooler, see .env.example). Created on
 * first use, so `next build` can load route modules without DATABASE_URL (e.g. in CI).
 */
export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

  const db = createDb(url);
  globalForDb.db = db;
  return db;
}
