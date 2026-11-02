import type { RelatedPlace } from "@/modules/places/types";
import type { ProposalErrors } from "./schemas";

/** A site just published from a proposal (HU-83). */
export interface PublishedPlace {
  slug: string;
  name: string;
  fragile: boolean;
}

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
  /** Nothing was saved: this IP used up its proposals for the day (HU-82). */
  | { status: "limited"; message: string }
  /** It passed every check and is published (HU-83). */
  | ({ status: "published" } & PublishedPlace);
