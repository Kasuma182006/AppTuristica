import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next.js env files; load .env.local locally (CI injects env vars).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL_DIRECT;
if (!url) throw new Error("DATABASE_URL_DIRECT is not set (see .env.example)");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: { url },
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
});
