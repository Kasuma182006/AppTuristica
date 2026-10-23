// Drizzle schema entry point. Tables are added per story (HU-09 onwards) and re-exported here.
// Every table must call `.enableRLS()` (checked by rls.test.ts): the app reaches Postgres through
// Drizzle, so RLS without policies only blocks Supabase's public Data API.
export * from "./departments";
export * from "./municipalities";
export * from "./place-types";
export * from "./activities";
export * from "./places";
export * from "./place-activities";
export * from "./photos";
export * from "./place-sources";
export * from "./agencies";
export * from "./reports";
export * from "./ingest-runs";
