// Deletes the reports past their time (`npm run purge-reports`, HU-85). Runs with the weekly ingest.
import { existsSync } from "node:fs";
import { deleteExpiredReports } from "@/modules/reports/repository";
import { connectIngestDb } from "./db";

// Like ingest/index.ts: load .env.local locally; GitHub Actions injects env vars.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  const { db, close } = connectIngestDb();
  try {
    const deleted = await deleteExpiredReports(db);
    console.log(`expired reports deleted: ${deleted}`);
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
