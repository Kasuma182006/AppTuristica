import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

export type Db = ReturnType<typeof createDb>;

// Reuse the client across hot reloads in development to avoid exhausting connections.
const globalForDb = globalThis as unknown as { db?: Db };

function createDb(url: string) {
  // Supabase transaction pooler does not support prepared statements.
  return drizzle(postgres(url, { prepare: false }), { schema });
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
