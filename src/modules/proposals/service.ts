import { TURNSTILE_TOKEN_FIELD, verifyTurnstile } from "@/lib/turnstile";
import type { ProposalResult } from "./types";

/**
 * Receives a proposal from the form (HU-79): the Turnstile token is checked here, on the server,
 * since whatever runs in the browser can be skipped. Checking the fields comes with HU-80, and
 * saving with HU-83.
 */
export async function receiveProposal(data: FormData): Promise<ProposalResult> {
  const token = data.get(TURNSTILE_TOKEN_FIELD);
  const verified = typeof token === "string" && (await verifyTurnstile(token));
  return { status: verified ? "received" : "not-verified" };
}
