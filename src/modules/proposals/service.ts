import { after } from "next/server";
import { getDb } from "@/lib/db";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { consumeRateLimit, deleteExpiredRateLimits, PROPOSAL_RATE_LIMIT } from "@/lib/rate-limit";
import { TURNSTILE_TOKEN_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { getCatalogs, locateInMunicipality } from "@/modules/catalogs/service";
import { findPossibleDuplicates } from "@/modules/places/service";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  NOT_DUPLICATE_FIELD,
  proposalFormValues,
  validateProposalForm,
  type ProposalErrors,
  type ProposalFormValues,
} from "./schemas";
import type { ProposalResult } from "./types";

const OUTSIDE_VALLE = "Ese punto queda fuera del Valle del Cauca. Márcalo dentro del departamento.";

/** What a visitor over the limit reads. The day ends at midnight UTC, not at theirs. */
export function limitMessage(retryAfterS: number): string {
  const hours = Math.ceil(retryAfterS / 3600);
  const wait = hours === 1 ? "1 hora" : `${hours} horas`;
  return `Desde tu conexión ya se enviaron las ${PROPOSAL_RATE_LIMIT.limit} propuestas permitidas por día. Podrás enviar otra en ${wait}.`;
}

/**
 * Counts an accepted proposal against the IP's daily limit (HU-82). It goes last, so fixing errors
 * or checking a possible duplicate uses up nothing. Only the IP's keyed hash is stored.
 */
async function checkLimit(headers: Headers): Promise<ProposalResult | null> {
  const db = getDb();
  const { allowed, retryAfterS, newWindow } = await consumeRateLimit(
    db,
    hashIp(clientIp(headers)),
    PROPOSAL_RATE_LIMIT,
  );
  if (newWindow) {
    after(() =>
      deleteExpiredRateLimits(db).catch((error: unknown) =>
        console.error("Deleting expired rate limits failed", error),
      ),
    );
  }
  return allowed ? null : { status: "limited", message: limitMessage(retryAfterS) };
}

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
 * choice comes back corrected for the visitor to review. With everything in order, it looks for
 * the same site already published (HU-81), unless the visitor said it is none of those.
 */
async function checkAgainstDatabase(
  values: ProposalFormValues,
  notDuplicate: boolean,
  headers: Headers,
): Promise<ProposalResult> {
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
  if (!located || Object.keys(errors).length > 0) return { status: "invalid", errors };

  if (!notDuplicate) {
    const duplicates = await findPossibleDuplicates(located.point, values.placeName);
    if (duplicates.length > 0) return { status: "duplicate", duplicates };
  }
  return (await checkLimit(headers)) ?? { status: "received" };
}

/**
 * Receives a proposal from the form. Everything is checked here, on the server, since whatever
 * runs in the browser can be skipped: first the Turnstile token (HU-79), which costs the database
 * nothing, then the fields (HU-80). Saving comes with HU-83.
 */
export async function receiveProposal(data: FormData, headers: Headers): Promise<ProposalResult> {
  const token = data.get(TURNSTILE_TOKEN_FIELD);
  const verified = typeof token === "string" && (await verifyTurnstile(token));
  if (!verified) return { status: "not-verified" };

  const validation = validateProposalForm(proposalFormValues(data));
  if (!validation.success) return { status: "invalid", errors: validation.errors };
  return withDeadline(
    checkAgainstDatabase(validation.values, data.has(NOT_DUPLICATE_FIELD), headers),
    PAGE_DATA_DEADLINE_MS,
    "la propuesta",
  );
}
