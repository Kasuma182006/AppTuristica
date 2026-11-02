import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { TURNSTILE_TOKEN_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { getCatalogs, locateInMunicipality } from "@/modules/catalogs/service";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  proposalFormValues,
  validateProposalForm,
  type ProposalErrors,
  type ProposalFormValues,
} from "./schemas";
import type { ProposalResult } from "./types";

const OUTSIDE_VALLE = "Ese punto queda fuera del Valle del Cauca. Márcalo dentro del departamento.";

/** What was chosen from a list but is not in it: only a form altered by hand gets here. */
export function catalogErrors(
  values: Pick<ProposalFormValues, "placeType" | "activities">,
  { placeTypes, activities }: Pick<Catalogs, "placeTypes" | "activities">,
): ProposalErrors {
  const errors: ProposalErrors = {};
  if (!placeTypes.some((type) => type.slug === values.placeType)) {
    errors.placeType = "Elige un tipo de sitio de la lista.";
  }
  if (!values.activities.every((slug) => activities.some((activity) => activity.slug === slug))) {
    errors.activities = "Elige las actividades de la lista.";
  }
  return errors;
}

/**
 * What only the database can answer (HU-80): that the lists have the chosen values, and where the
 * point is. The municipality is the one the point falls in, whatever was chosen, so a different
 * choice comes back corrected for the visitor to review.
 */
async function checkAgainstDatabase(values: ProposalFormValues): Promise<ProposalResult> {
  const [catalogs, located] = await Promise.all([
    getCatalogs(),
    locateInMunicipality({ lat: values.latitude, lon: values.longitude }),
  ]);
  const errors = catalogErrors(values, catalogs);
  if (!located) {
    errors.latitude = OUTSIDE_VALLE;
  } else if (located.slug !== values.municipality) {
    errors.municipality = `El punto queda en ${located.name}: cambiamos el municipio. Revísalo y envía de nuevo.`;
    return { status: "invalid", errors, suggestedMunicipality: located.slug };
  }
  return Object.keys(errors).length > 0 ? { status: "invalid", errors } : { status: "received" };
}

/**
 * Receives a proposal from the form. Everything is checked here, on the server, since whatever
 * runs in the browser can be skipped: first the Turnstile token (HU-79), which costs the database
 * nothing, then the fields (HU-80). Saving comes with HU-83.
 */
export async function receiveProposal(data: FormData): Promise<ProposalResult> {
  const token = data.get(TURNSTILE_TOKEN_FIELD);
  const verified = typeof token === "string" && (await verifyTurnstile(token));
  if (!verified) return { status: "not-verified" };

  const validation = validateProposalForm(proposalFormValues(data));
  if (!validation.success) return { status: "invalid", errors: validation.errors };
  return withDeadline(
    checkAgainstDatabase(validation.values),
    PAGE_DATA_DEADLINE_MS,
    "la propuesta",
  );
}
