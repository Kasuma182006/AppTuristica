import { getDb } from "@/lib/db";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { TURNSTILE_TOKEN_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { saveReport } from "./repository";
import {
  REPORT_PLACE_FIELD,
  reportFormValues,
  reportPlaceSchema,
  validateReportForm,
} from "./schemas";
import type { ReportResult } from "./types";

/**
 * Receives a report from a site's page (HU-84, RF-22). Everything is checked here, on the server,
 * since whatever runs in the browser can be skipped: first the Turnstile token, which costs the
 * database nothing, then the fields. Only the IP's keyed hash is stored.
 */
export async function receiveReport(data: FormData, headers: Headers): Promise<ReportResult> {
  const token = data.get(TURNSTILE_TOKEN_FIELD);
  const verified = typeof token === "string" && (await verifyTurnstile(token));
  if (!verified) return { status: "not-verified" };

  const place = reportPlaceSchema.safeParse(data.get(REPORT_PLACE_FIELD));
  if (!place.success) return { status: "not-found" };

  const validation = validateReportForm(reportFormValues(data));
  if (!validation.success) return { status: "invalid", errors: validation.errors };

  const saved = await withDeadline(
    saveReport(getDb(), {
      placeSlug: place.data,
      ...validation.values,
      ipHash: hashIp(clientIp(headers)),
    }),
    PAGE_DATA_DEADLINE_MS,
    "el reporte",
  );
  return { status: saved ? "received" : "not-found" };
}
