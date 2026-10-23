// Seeds reference data (`npm run db:seed`). Idempotent: safe to run after every migration.
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";
import { formatSeedResult } from "./common";
import { seedDepartments } from "./departments";
import { seedMunicipalities } from "./municipalities";
import { seedPlaceTypes } from "./place-types";

// Like drizzle.config.ts: load .env.local locally; CI injects env vars.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) throw new Error("DATABASE_URL_DIRECT is not set (see .env.example)");

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client, { schema });
    // One transaction: a failed check (e.g. a municipality outside its department) changes nothing.
    const results = await db.transaction(async (tx) => ({
      departments: await seedDepartments(tx),
      municipalities: await seedMunicipalities(tx),
      placeTypes: await seedPlaceTypes(tx),
    }));
    for (const [label, result] of Object.entries(results)) {
      console.log(formatSeedResult(label, result));
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
