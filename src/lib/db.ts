import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

// Reuse the client across hot reloads in development to avoid exhausting connections.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// Supabase transaction pooler does not support prepared statements.
const client = globalForDb.pgClient ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
