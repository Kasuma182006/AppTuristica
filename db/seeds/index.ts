// Seeds reference data (`npm run db:seed`). Idempotent: safe to run after every migration.
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";
import { seedDepartments } from "./departments";

// Like drizzle.config.ts: load .env.local locally; CI injects env vars.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) throw new Error("DATABASE_URL_DIRECT is not set (see .env.example)");

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client, { schema });
    const departments = await seedDepartments(db);
    console.log(
      `departments: ${departments.inserted.length} inserted, ` +
        `${departments.updated.length} updated, ${departments.unchanged.length} unchanged`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
