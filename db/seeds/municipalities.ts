import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { departments, municipalities } from "@db/schema";
import { slugify } from "@/lib/slug";
import { boundaryCollectionSchema, type BoundaryCollection, type BoundarySource } from "./boundary";
import {
  boundaryPath,
  emptySeedResult,
  recordUpsert,
  type SeedDb,
  type SeedResult,
} from "./common";
import { DEPARTMENTS } from "./departments";
import { multiPolygonFromGeoJson } from "./geometry";

export interface MunicipalitySource extends BoundarySource {
  /** Only when the name's slug collides with another department's municipality (e.g. "Argelia"). */
  slug?: string;
}

// Codes from DANE's DIVIPOLA (datos.gov.co, dataset gdxc-w37w); names are the common ones
// people search for ("Cali", "Buga"), not the official long form. OSM relations checked by
// db:fetch-boundary against their divipola tag, or their name when the tag is missing.
export const MUNICIPALITIES: readonly MunicipalitySource[] = [
  { code: "76001", name: "Cali", osmRelationId: 1320707 },
  { code: "76020", name: "Alcalá", osmRelationId: 1460505 },
  { code: "76036", name: "Andalucía", osmRelationId: 1461001 },
  { code: "76041", name: "Ansermanuevo", osmRelationId: 1461170 },
  { code: "76054", name: "Argelia", osmRelationId: 1461222 },
  { code: "76100", name: "Bolívar", osmRelationId: 1461292 },
  { code: "76109", name: "Buenaventura", osmRelationId: 1311768 },
  { code: "76111", name: "Buga", osmRelationId: 1461502 },
  { code: "76113", name: "Bugalagrande", osmRelationId: 1462480 },
  { code: "76122", name: "Caicedonia", osmRelationId: 1470279 },
  { code: "76126", name: "Calima", osmRelationId: 1472569 },
  { code: "76130", name: "Candelaria", osmRelationId: 1473641 },
  { code: "76147", name: "Cartago", osmRelationId: 1460512 },
  { code: "76233", name: "Dagua", osmRelationId: 4046886 },
  { code: "76243", name: "El Águila", osmRelationId: 1473586 },
  { code: "76246", name: "El Cairo", osmRelationId: 1473583 },
  { code: "76248", name: "El Cerrito", osmRelationId: 1473612 },
  { code: "76250", name: "El Dovio", osmRelationId: 1473587 },
  { code: "76275", name: "Florida", osmRelationId: 1319503 },
  { code: "76306", name: "Ginebra", osmRelationId: 1473615 },
  { code: "76318", name: "Guacarí", osmRelationId: 1473616 },
  { code: "76364", name: "Jamundí", osmRelationId: 4046923 },
  { code: "76377", name: "La Cumbre", osmRelationId: 5794061 },
  { code: "76400", name: "La Unión", osmRelationId: 1473589 },
  { code: "76403", name: "La Victoria", osmRelationId: 1473595 },
  { code: "76497", name: "Obando", osmRelationId: 1460959 },
  { code: "76520", name: "Palmira", osmRelationId: 1473610 },
  { code: "76563", name: "Pradera", osmRelationId: 1356412 },
  { code: "76606", name: "Restrepo", osmRelationId: 1473605 },
  { code: "76616", name: "Riofrío", osmRelationId: 1473600 },
  { code: "76622", name: "Roldanillo", osmRelationId: 1473594 },
  { code: "76670", name: "San Pedro", osmRelationId: 1473597 },
  { code: "76736", name: "Sevilla", osmRelationId: 4046960 },
  { code: "76823", name: "Toro", osmRelationId: 1473590 },
  { code: "76828", name: "Trujillo", osmRelationId: 1473596 },
  { code: "76834", name: "Tuluá", osmRelationId: 1473598 },
  { code: "76845", name: "Ulloa", osmRelationId: 1311763 },
  { code: "76863", name: "Versalles", osmRelationId: 1473592 },
  { code: "76869", name: "Vijes", osmRelationId: 1554306 },
  { code: "76890", name: "Yotoco", osmRelationId: 1554296 },
  { code: "76892", name: "Yumbo", osmRelationId: 1320727 },
  { code: "76895", name: "Zarzal", osmRelationId: 1464203 },
];

// Share of a municipality's area allowed outside its department (boundary digitizing noise).
const MAX_OUTSIDE_SHARE = 0.01;

export function departmentCodeOf(municipalityCode: string): string {
  return municipalityCode.slice(0, 2);
}

export function municipalitiesOf(departmentCode: string): MunicipalitySource[] {
  return MUNICIPALITIES.filter((m) => departmentCodeOf(m.code) === departmentCode);
}

export function slugOf(municipality: MunicipalitySource): string {
  return municipality.slug ?? slugify(municipality.name);
}

/** Reads a department's committed municipality boundaries, checking they match the configuration. */
export async function loadMunicipalityBoundaries(
  departmentCode: string,
): Promise<BoundaryCollection> {
  const raw: unknown = JSON.parse(
    await readFile(boundaryPath("municipalities", departmentCode), "utf8"),
  );
  const collection = boundaryCollectionSchema.parse(raw);

  const expected = municipalitiesOf(departmentCode);
  const actual = collection.features.map((f) => f.properties);
  const sameSet =
    actual.length === expected.length &&
    expected.every((m) =>
      actual.some((a) => a.code === m.code && a.osmRelationId === m.osmRelationId),
    );
  if (!sameSet) {
    throw new Error(
      `Municipality boundaries for ${departmentCode} do not match municipalities.ts; ` +
        `run npm run db:fetch-boundary -- ${departmentCode}`,
    );
  }
  return collection;
}

/**
 * Upserts every configured municipality by DIVIPOLA code, linked to its department (seeded first),
 * then checks each one lies inside its department. Safe to run repeatedly.
 */
export async function seedMunicipalities(db: SeedDb): Promise<SeedResult> {
  const result = emptySeedResult();

  for (const department of DEPARTMENTS) {
    const [row] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.code, department.code));
    if (!row)
      throw new Error(`Department ${department.code} must be seeded before its municipalities`);

    const collection = await loadMunicipalityBoundaries(department.code);
    for (const municipality of municipalitiesOf(department.code)) {
      const feature = collection.features.find((f) => f.properties.code === municipality.code);
      if (!feature) throw new Error(`Missing boundary for municipality ${municipality.code}`);

      const rows = await db
        .insert(municipalities)
        .values({
          code: municipality.code,
          name: municipality.name,
          slug: slugOf(municipality),
          departmentId: row.id,
          geom: multiPolygonFromGeoJson(feature.geometry),
        })
        .onConflictDoUpdate({
          target: municipalities.code,
          set: {
            name: sql`excluded.name`,
            slug: sql`excluded.slug`,
            departmentId: sql`excluded.department_id`,
            geom: sql`excluded.geom`,
            updatedAt: sql`now()`,
          },
          // Skip the write when nothing changed, so updated_at reflects real data changes.
          setWhere: sql`(${municipalities.name}, ${municipalities.slug}, ${municipalities.departmentId})
              IS DISTINCT FROM (excluded.name, excluded.slug, excluded.department_id)
            OR NOT ST_OrderingEquals(${municipalities.geom}, excluded.geom)`,
        })
        .returning({ inserted: sql<boolean>`(xmax = 0)` });

      recordUpsert(result, municipality.code, rows);
    }

    await assertInsideDepartment(db, row.id);
  }

  return result;
}

async function assertInsideDepartment(db: SeedDb, departmentId: number): Promise<void> {
  const outside = await db.execute<{ code: string; outside_share: number }>(sql`
    SELECT m.code,
      1 - ST_Area(ST_Intersection(m.geom, d.geom)::geography) / ST_Area(m.geom::geography)
        AS outside_share
    FROM ${municipalities} m
    JOIN ${departments} d ON d.id = m.department_id
    WHERE d.id = ${departmentId}
      AND 1 - ST_Area(ST_Intersection(m.geom, d.geom)::geography) / ST_Area(m.geom::geography)
        > ${MAX_OUTSIDE_SHARE}
  `);
  if (outside.length > 0) {
    const detail = outside
      .map((r) => `${r.code} (${(Number(r.outside_share) * 100).toFixed(1)}% outside)`)
      .join(", ");
    throw new Error(`Municipalities outside their department: ${detail}`);
  }
}
