import { getDb } from "@/lib/db";
import { countActiveAgencies, findRandomActiveAgencies } from "./repository";
import { AGENCIES_SHOWN, type MunicipalityAgencies } from "./types";

/** Agencies for a site page of the municipality (HU-66, RF-16); total 0 hides the section. */
export async function getMunicipalityAgencies(
  municipalitySlug: string,
): Promise<MunicipalityAgencies> {
  const db = getDb();
  const [total, shown] = await Promise.all([
    countActiveAgencies(db, municipalitySlug),
    findRandomActiveAgencies(db, municipalitySlug, AGENCIES_SHOWN),
  ]);
  return { total, shown };
}
