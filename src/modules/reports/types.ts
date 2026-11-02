import type { ReportErrors } from "./schemas";

/** What happened to a report sent from the site's page. */
export type ReportResult =
  /** Nothing was saved: Cloudflare did not confirm the visitor is a person. */
  | { status: "not-verified" }
  /** Nothing was saved: something to fix, shown next to each field. */
  | { status: "invalid"; errors: ReportErrors }
  /** Nothing was saved: the site is hidden or no longer exists. */
  | { status: "not-found" }
  /** It passed every check. */
  | { status: "received" };
