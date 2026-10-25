import { eq, inArray } from "drizzle-orm";
import { agencies, municipalities, type agencyStatusEnum } from "@db/schema";
import type { IngestDb } from "../../db";
import { isCompanyNit, normalizeEmail, normalizePhone, titleCaseName } from "./normalize";
import type { RntRow } from "./socrata";

/** An agency as the RNT lists it, normalized. */
export interface RntAgency {
  rntNumber: number;
  name: string;
  /** DIVIPOLA code, matched to municipalities.code. */
  municipalityCode: string;
  /** Null for agencies of natural persons, whose contact data is personal. */
  phone: string | null;
  email: string | null;
}

export function toAgency(row: RntRow): RntAgency {
  const company = isCompanyNit(row.nit);
  return {
    rntNumber: Number(row.codigo_rnt),
    name: titleCaseName(row.razon_social_establecimiento),
    municipalityCode: row.cod_mun,
    phone: company ? normalizePhone(row.num_celular, row.n_m_tel_fono) : null,
    email: company ? normalizeEmail(row.correo_establecimiento) : null,
  };
}

/** The agencies columns that ingest writes, besides status and dates. */
export interface AgencyFields {
  rntNumber: number;
  name: string;
  municipalityId: number;
  phone: string | null;
  email: string | null;
}

export interface StoredAgency extends AgencyFields {
  id: number;
  status: (typeof agencyStatusEnum.enumValues)[number];
}

export interface AgencyPlan {
  creates: AgencyFields[];
  /** Changed data, or back in the RNT after being inactive. */
  updates: { id: number; fields: AgencyFields }[];
  unchangedIds: number[];
  /** Active agencies the RNT no longer lists. */
  inactivateIds: number[];
  /** RNT numbers of agencies whose municipality is not in scope, left out. */
  unknownMunicipality: number[];
}

const sameFields = (a: AgencyFields, b: AgencyFields) =>
  a.name === b.name &&
  a.municipalityId === b.municipalityId &&
  a.phone === b.phone &&
  a.email === b.email;

/** What to write so `agencies` matches the RNT, matching agencies by RNT number (HU-32). */
export function planAgencies(
  listed: readonly RntAgency[],
  stored: readonly StoredAgency[],
  municipalityIds: ReadonlyMap<string, number>,
): AgencyPlan {
  const byNumber = new Map(stored.map((agency) => [agency.rntNumber, agency]));
  const plan: AgencyPlan = {
    creates: [],
    updates: [],
    unchangedIds: [],
    inactivateIds: [],
    unknownMunicipality: [],
  };
  const seen = new Set<number>();

  for (const agency of listed) {
    if (seen.has(agency.rntNumber)) continue;
    seen.add(agency.rntNumber);
    const municipalityId = municipalityIds.get(agency.municipalityCode);
    if (municipalityId === undefined) {
      plan.unknownMunicipality.push(agency.rntNumber);
      continue;
    }
    const fields: AgencyFields = {
      rntNumber: agency.rntNumber,
      name: agency.name,
      municipalityId,
      phone: agency.phone,
      email: agency.email,
    };
    const current = byNumber.get(agency.rntNumber);
    if (!current) plan.creates.push(fields);
    else if (current.status !== "active" || !sameFields(current, fields)) {
      plan.updates.push({ id: current.id, fields });
    } else plan.unchangedIds.push(current.id);
  }

  for (const agency of stored) {
    if (agency.status === "active" && !seen.has(agency.rntNumber)) {
      plan.inactivateIds.push(agency.id);
    }
  }
  return plan;
}

export async function loadStoredAgencies(db: IngestDb): Promise<StoredAgency[]> {
  return db
    .select({
      id: agencies.id,
      rntNumber: agencies.rntNumber,
      name: agencies.name,
      municipalityId: agencies.municipalityId,
      phone: agencies.phone,
      email: agencies.email,
      status: agencies.status,
    })
    .from(agencies);
}

/** Municipality ids by DIVIPOLA code. */
export async function loadMunicipalityIds(db: IngestDb): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: municipalities.id, code: municipalities.code })
    .from(municipalities);
  return new Map(rows.map((row) => [row.code, row.id]));
}

const INSERT_BATCH = 500;

/** Writes the plan in one transaction: the table always matches one RNT snapshot. */
export async function applyAgencyPlan(db: IngestDb, plan: AgencyPlan, now: Date): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < plan.creates.length; i += INSERT_BATCH) {
      const batch = plan.creates.slice(i, i + INSERT_BATCH);
      await tx
        .insert(agencies)
        .values(
          batch.map((fields) => ({ ...fields, lastSeenAt: now, createdAt: now, updatedAt: now })),
        );
    }
    for (const { id, fields } of plan.updates) {
      await tx
        .update(agencies)
        .set({ ...fields, status: "active", lastSeenAt: now, updatedAt: now })
        .where(eq(agencies.id, id));
    }
    if (plan.unchangedIds.length > 0) {
      await tx
        .update(agencies)
        .set({ lastSeenAt: now })
        .where(inArray(agencies.id, plan.unchangedIds));
    }
    if (plan.inactivateIds.length > 0) {
      await tx
        .update(agencies)
        .set({ status: "inactive", updatedAt: now })
        .where(inArray(agencies.id, plan.inactivateIds));
    }
  });
}

/** e.g. "saved: 1604 created, 0 updated, 0 unchanged, 0 inactivated". */
export function summarizeAgencyPlan(plan: AgencyPlan): string {
  return (
    `saved: ${plan.creates.length} created, ${plan.updates.length} updated, ` +
    `${plan.unchangedIds.length} unchanged, ${plan.inactivateIds.length} inactivated`
  );
}
