"use server";

import { receiveProposal } from "@/modules/proposals/service";
import type { ProposalResult } from "@/modules/proposals/types";

/** Where the proposal form sends its data (HU-79). */
export async function submitProposal(data: FormData): Promise<ProposalResult> {
  return receiveProposal(data);
}
