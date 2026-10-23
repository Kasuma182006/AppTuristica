import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@db/schema";
import { departments } from "@db/schema";
import { boundaryFileSchema, type BoundaryFile, type BoundarySource } from "./boundary";
import { multiPolygonFromGeoJson } from "./geometry";

// Departments in scope (RNF-08): adding one means a new entry here plus its boundary file,
// downloaded with `npm run db:fetch-boundary -- <code>`.
export const DEPARTMENTS: readonly BoundarySource[] = [
  { code: "76", name: "Valle del Cauca", osmRelationId: 1322825 },
];

const DATA_DIR = new URL("./data/departments/", import.meta.url);

export function boundaryFilePath(code: string): string {
  return fileURLToPath(new URL(`${code}.geojson`, DATA_DIR));
}

export function findDepartment(code: string): BoundarySource {
  const department = DEPARTMENTS.find((d) => d.code === code);
  if (!department) {
    const known = DEPARTMENTS.map((d) => d.code).join(", ");
    throw new Error(`Unknown department code "${code}" (configured: ${known})`);
  }
  return department;
}

/** Reads and validates a committed boundary file, checking it belongs to the given department. */
export async function loadBoundaryFile(department: BoundarySource): Promise<BoundaryFile> {
  const raw: unknown = JSON.parse(await readFile(boundaryFilePath(department.code), "utf8"));
  const file = boundaryFileSchema.parse(raw);
  const { code, osmRelationId } = file.properties;
  if (code !== department.code || osmRelationId !== department.osmRelationId) {
    throw new Error(
      `Boundary file for ${department.code} describes ${code} (OSM relation ${osmRelationId})`,
    );
  }
  return file;
}

export type SeedDb = PostgresJsDatabase<typeof schema>;

export interface SeedResult {
  inserted: string[];
  updated: string[];
  unchanged: string[];
}

/** Upserts every configured department by DIVIPOLA code. Safe to run repeatedly. */
export async function seedDepartments(db: SeedDb): Promise<SeedResult> {
  const result: SeedResult = { inserted: [], updated: [], unchanged: [] };

  for (const department of DEPARTMENTS) {
    const file = await loadBoundaryFile(department);
    const rows = await db
      .insert(departments)
      .values({
        code: department.code,
        name: department.name,
        geom: multiPolygonFromGeoJson(file.geometry),
      })
      .onConflictDoUpdate({
        target: departments.code,
        set: { name: sql`excluded.name`, geom: sql`excluded.geom`, updatedAt: sql`now()` },
        // Skip the write when nothing changed, so updated_at reflects real data changes.
        setWhere: sql`${departments.name} IS DISTINCT FROM excluded.name
          OR NOT ST_OrderingEquals(${departments.geom}, excluded.geom)`,
      })
      // xmax = 0 only on freshly inserted rows (a Postgres system column).
      .returning({ inserted: sql<boolean>`(xmax = 0)` });

    const row = rows[0];
    if (!row) result.unchanged.push(department.code);
    else if (row.inserted) result.inserted.push(department.code);
    else result.updated.push(department.code);
  }

  return result;
}
