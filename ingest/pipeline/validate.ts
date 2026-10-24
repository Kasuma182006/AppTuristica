import type { Discarded, DiscardReason, LocatedCandidate, ValidSite } from "./types";

/** The first missing minimum field, in this order, or null when the site is valid. */
export function discardReasonOf(site: LocatedCandidate): DiscardReason | null {
  if (site.name === null) return "no-name";
  if (site.placeTypeSlug === null) return "no-type";
  if (site.point === null) return "no-point";
  // The 42 municipalities cover exactly the department, so no municipality means outside it.
  if (site.municipalityId === null) return "outside-area";
  return null;
}

function isValid(site: LocatedCandidate): site is ValidSite {
  return discardReasonOf(site) === null;
}

/** Keeps the sites with name, type, point and municipality (HU-24); the rest get their reason. */
export function discardInvalid(sites: readonly LocatedCandidate[]): {
  valid: ValidSite[];
  discarded: Discarded[];
} {
  const valid: ValidSite[] = [];
  const discarded: Discarded[] = [];
  for (const site of sites) {
    const reason = discardReasonOf(site);
    if (isValid(site)) valid.push(site);
    else if (reason !== null) {
      discarded.push({
        externalIds: site.elements.map((e) => e.externalId),
        name: site.name,
        reason,
      });
    }
  }
  return { valid, discarded };
}

const MAX_IDS_SHOWN = 3;

/** One log line: `no-name: (sin nombre) [way/1, way/2, way/3 +4]`. */
export function formatDiscarded(item: Discarded): string {
  const shown = item.externalIds.slice(0, MAX_IDS_SHOWN).join(", ");
  const more = item.externalIds.length - MAX_IDS_SHOWN;
  return `${item.reason}: ${item.name ?? "(sin nombre)"} [${shown}${more > 0 ? ` +${more}` : ""}]`;
}

/** Counts by reason, most frequent first: `no-name: 494, outside-area: 7`. */
export function summarizeDiscarded(discarded: readonly Discarded[]): string {
  const counts = new Map<DiscardReason, number>();
  for (const item of discarded) counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(", ");
}
