import type { RelatedPlace } from "@/modules/places/types";
import type { ProposalErrors } from "./schemas";

/** What happened to a proposal sent from the form. */
export type ProposalResult =
  /** Nothing was saved: Cloudflare did not confirm the visitor is a person (HU-79). */
  | { status: "not-verified" }
  /** Nothing was saved: something to fix, shown next to each field (HU-80). */
  | {
      status: "invalid";
      errors: ProposalErrors;
      /** The municipality where the point really is, when it is not the chosen one. */
      suggestedMunicipality?: string;
    }
  /** Nothing was saved: sites that may be the same, for the visitor to check (HU-81). */
  | { status: "duplicate"; duplicates: Pick<RelatedPlace, "slug" | "name">[] }
  /** It passed the checks. Nothing is saved until HU-83. */
  | { status: "received" };
