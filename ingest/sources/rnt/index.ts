import { DEPARTMENTS } from "@db/seeds/departments";
import type { IngestSource } from "../types";
import {
  applyAgencyPlan,
  loadMunicipalityIds,
  loadStoredAgencies,
  planAgencies,
  summarizeAgencyPlan,
  toAgency,
} from "./agencies";
import { AGENCY_SUBCATEGORIES } from "./normalize";
import { buildAgenciesWhere, fetchRntAgencies } from "./socrata";

// Travel agencies from the RNT (datos.gov.co) into `agencies`, by RNT number (HU-32).
export const rntSource: IngestSource = {
  name: "rnt",
  description: "agencias del Registro Nacional de Turismo",
  async run({ db }) {
    const where = buildAgenciesWhere(
      DEPARTMENTS.map((d) => d.code),
      AGENCY_SUBCATEGORIES,
    );
    const download = await fetchRntAgencies(where);
    const invalid =
      download.invalid.length > 0
        ? ` (${download.invalid.length} without a required field: ${download.invalid.join(", ")})`
        : "";
    console.log(`rnt: fetched ${download.rows.length} active agencies${invalid}`);

    const listed = download.rows.map(toAgency);
    const withContact = listed.filter((a) => a.phone !== null || a.email !== null).length;
    console.log(
      `rnt: ${withContact} with business contact; ${listed.length - withContact} of natural ` +
        `persons or without valid contact, saved without it`,
    );

    const plan = planAgencies(listed, await loadStoredAgencies(db), await loadMunicipalityIds(db));
    if (plan.unknownMunicipality.length > 0) {
      console.log(
        `rnt: left out ${plan.unknownMunicipality.length} agencies of unknown municipalities: ` +
          plan.unknownMunicipality.join(", "),
      );
    }
    await applyAgencyPlan(db, plan, new Date());
    console.log(`rnt: ${summarizeAgencyPlan(plan)}`);
    return {
      created: plan.creates.length,
      updated: plan.updates.length,
      unchanged: plan.unchangedIds.length,
      removed: plan.inactivateIds.length,
      discarded: download.invalid.length + plan.unknownMunicipality.length,
      errors: [],
    };
  },
};
