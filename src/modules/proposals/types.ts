/** What happened to a proposal sent from the form. */
export type ProposalResult =
  /** Nothing was saved: Cloudflare did not confirm the visitor is a person (HU-79). */
  | { status: "not-verified" }
  /** It passed the checks. Nothing is saved until HU-83. */
  | { status: "received" };
