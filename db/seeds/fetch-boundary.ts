// Downloads a department's boundary and its municipalities' boundaries from OpenStreetMap (via
// Nominatim) into db/seeds/data.
// Usage: npm run db:fetch-boundary -- <divipola-code>   e.g. `-- 76`
// Run by hand only when adding or refreshing a department; the seed reads the committed files.
import { writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { buildBoundaryCollection, buildBoundaryFeature, type BoundarySource } from "./boundary";
import { boundaryPath } from "./common";
import { findDepartment } from "./departments";
import { municipalitiesOf } from "./municipalities";

// Nominatim usage policy: identify the app, max 1 request/second, no bulk downloads.
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";
const REQUEST_INTERVAL_MS = 1100;
// Nominatim /lookup accepts at most 50 OSM ids per request.
const MAX_IDS_PER_LOOKUP = 50;

async function lookup(sources: readonly BoundarySource[]): Promise<unknown> {
  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.search = new URLSearchParams({
    osm_ids: sources.map((s) => `R${s.osmRelationId}`).join(","),
    format: "geojson",
    extratags: "1",
    polygon_geojson: "1",
    // Full resolution: sites near a border must be validated against the real boundary.
    polygon_threshold: "0",
  }).toString();

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
  return response.json();
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value)}\n`);
  console.log(`Wrote ${path}`);
}

async function main(): Promise<void> {
  const code = process.argv[2];
  if (!code) throw new Error("Usage: npm run db:fetch-boundary -- <divipola-code>");
  const department = findDepartment(code);
  const municipalities = municipalitiesOf(code);
  if (municipalities.length === 0) throw new Error(`No municipalities configured for ${code}`);
  const retrievedAt = new Date();

  const departmentFeature = buildBoundaryFeature(
    department,
    await lookup([department]),
    retrievedAt,
  );

  const responses: unknown[] = [];
  for (let i = 0; i < municipalities.length; i += MAX_IDS_PER_LOOKUP) {
    await sleep(REQUEST_INTERVAL_MS);
    responses.push(await lookup(municipalities.slice(i, i + MAX_IDS_PER_LOOKUP)));
  }
  const collection = buildBoundaryCollection(municipalities, responses, retrievedAt);

  // Write only after every check passed, so a failed run never leaves half-updated data.
  await writeJson(boundaryPath("departments", code), departmentFeature);
  await writeJson(boundaryPath("municipalities", code), collection);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
