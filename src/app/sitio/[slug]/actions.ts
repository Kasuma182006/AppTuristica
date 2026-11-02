"use server";

import { headers } from "next/headers";
import { receiveReport } from "@/modules/reports/service";
import type { ReportResult } from "@/modules/reports/types";

/** Where the report form sends its data (HU-84). */
export async function submitReport(data: FormData): Promise<ReportResult> {
  return receiveReport(data, await headers());
}
