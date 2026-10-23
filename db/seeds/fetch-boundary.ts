// Downloads a department boundary from OpenStreetMap (via Nominatim) into db/seeds/data.
// Usage: npm run db:fetch-boundary -- <divipola-code>   e.g. `-- 76`
// Run by hand only when adding or refreshing a department; the seed reads the committed file.
import { writeFile } from "node:fs/promises";
import { buildBoundaryFile } from "./boundary";
import { boundaryFilePath, findDepartment } from "./departments";

// Nominatim usage policy: identify the app, max 1 request/second, no bulk downloads.
const USER_AGENT = "buscador-turistico (https://app-turistica.vercel.app)";

async function main(): Promise<void> {
  const code = process.argv[2];
  if (!code) throw new Error("Usage: npm run db:fetch-boundary -- <divipola-code>");
  const department = findDepartment(code);

  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.search = new URLSearchParams({
    osm_ids: `R${department.osmRelationId}`,
    format: "geojson",
    extratags: "1",
    polygon_geojson: "1",
    // Full resolution: sites near the border must be validated against the real boundary.
    polygon_threshold: "0",
  }).toString();

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);

  const file = buildBoundaryFile(department, await response.json(), new Date());
  const path = boundaryFilePath(department.code);
  await writeFile(path, `${JSON.stringify(file)}\n`);
  console.log(`Wrote ${path}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
