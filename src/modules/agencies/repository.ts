import { and, asc, count, eq, sql } from "drizzle-orm";
import { agencies, municipalities } from "@db/schema";
import type { Db } from "@/lib/db";
import type { Agency } from "./types";

/** Agencies no longer in the RNT stay in the table as inactive and are never shown (HU-32). */
const isActive = eq(agencies.status, "active");

const inMunicipality = (slug: string) => and(eq(municipalities.slug, slug), isActive);

/** Active agencies of a municipality. */
export async function countActiveAgencies(db: Db, municipalitySlug: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(agencies)
    .innerJoin(municipalities, eq(municipalities.id, agencies.municipalityId))
    .where(inMunicipality(municipalitySlug));
  return row?.total ?? 0;
}

/**
 * Up to `limit` active agencies of a municipality, those with a phone or email first and in a
 * new random order on each call: a fixed order would always favor the same ones (RF-16 says
 * the list is not a recommendation).
 */
export async function findRandomActiveAgencies(
  db: Db,
  municipalitySlug: string,
  limit: number,
): Promise<Agency[]> {
  return db
    .select({
      rntNumber: agencies.rntNumber,
      name: agencies.name,
      phone: agencies.phone,
      email: agencies.email,
    })
    .from(agencies)
    .innerJoin(municipalities, eq(municipalities.id, agencies.municipalityId))
    .where(inMunicipality(municipalitySlug))
    .orderBy(asc(sql`(${agencies.phone} is null and ${agencies.email} is null)`), sql`random()`)
    .limit(limit);
}
