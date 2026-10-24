// Imports open data into the database (`npm run ingest`).
// Usage: npm run ingest                    all sources
//        npm run ingest -- --source=osm    a single source
// Exits with code 1 if any source failed, after running the rest.
import { existsSync } from "node:fs";
import { selectSources } from "./cli";
import { connectIngestDb } from "./db";
import { formatOutcome, runSources } from "./run";
import { sources } from "./sources";

// Like db/seeds: load .env.local locally; GitHub Actions injects env vars.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  let selected;
  try {
    selected = selectSources(process.argv.slice(2), sources);
  } catch (error) {
    // A usage error: the message is enough, no stack trace.
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const { db, close } = connectIngestDb();
  let outcomes;
  try {
    outcomes = await runSources(selected, { db });
  } finally {
    await close();
  }

  for (const outcome of outcomes) {
    if (outcome.ok) console.log(formatOutcome(outcome));
    else {
      console.error(formatOutcome(outcome));
      console.error(outcome.error);
    }
  }
  if (outcomes.some((o) => !o.ok)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
