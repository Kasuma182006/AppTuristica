import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { departments } from "@db/schema";
import { boundaryFeatureSchema, type BoundaryFeature, type BoundarySource } from "./boundary";
import {
  boundaryPath,
  emptySeedResult,
  recordUpsert,
  type SeedDb,
  type SeedResult,
} from "./common";
import { multiPolygonFromGeoJson } from "./geometry";

// Departments in scope (RNF-08): adding one means a new entry here, its municipalities in
// municipalities.ts and its boundary files, downloaded with `npm run db:fetch-boundary -- <code>`.
export const DEPARTMENTS: readonly BoundarySource[] = [
  { code: "76", name: "Valle del Cauca", osmRelationId: 1322825 },
];

export function findDepartment(code: string): BoundarySource {
  const department = DEPARTMENTS.find((d) => d.code === code);
  if (!department) {
    const known = DEPARTMENTS.map((d) => d.code).join(", ");
    throw new Error(`Unknown department code "${code}" (configured: ${known})`);
  }
  return department;
}

/** Reads and validates a committed boundary file, checking it belongs to the given department. */
export async function loadDepartmentBoundary(department: BoundarySource): Promise<BoundaryFeature> {
  const raw: unknown = JSON.parse(
    await readFile(boundaryPath("departments", department.code), "utf8"),
  );
  const feature = boundaryFeatureSchema.parse(raw);
  const { code, osmRelationId } = feature.properties;
  if (code !== department.code || osmRelationId !== department.osmRelationId) {
    throw new Error(
      `Boundary file for ${department.code} describes ${code} (OSM relation ${osmRelationId})`,
    );
  }
  return feature;
}

/** Upserts every configured department by DIVIPOLA code. Safe to run repeatedly. */
export async function seedDepartments(db: SeedDb): Promise<SeedResult> {
  const result = emptySeedResult();

  for (const department of DEPARTMENTS) {
    const feature = await loadDepartmentBoundary(department);
    const rows = await db
      .insert(departments)
      .values({
        code: department.code,
        name: department.name,
        geom: multiPolygonFromGeoJson(feature.geometry),
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

    recordUpsert(result, department.code, rows);
  }

  return result;
}
