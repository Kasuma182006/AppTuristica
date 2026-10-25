import { slugify } from "@/lib/slug";
import type { Discarded, DiscardReason, LocatedCandidate, ValidSite } from "./types";

// Names of infrastructure that OSM tags like a lake or reservoir (e.g. a landfill's
// "Piscina de Lixiviados"), as slug fragments. Extend the list when another one shows up.
const NON_TOURIST_NAME_PARTS: readonly string[] = [
  "lixiviado",
  "planta-de-tratamiento",
  "oxidacion",
  "relleno-sanitario",
  "aguas-residuales",
  "ptar",
];

// Names that only repeat a type word (e.g. "Cerro"), as slugs; such sites have no real name.
// Extend the list when another one shows up.
const GENERIC_NAMES: ReadonlySet<string> = new Set([
  "cerro",
  "pico",
  "loma",
  "volcan",
  "mirador",
  "torre-de-avistamiento",
  "cascada",
  "salto",
  "rio",
  "quebrada",
  "lago",
  "laguna",
  "embalse",
  "sendero",
  "playa",
  "balneario",
  "charco",
  "reserva",
  "reserva-natural",
]);
// Shorter names are abbreviations, like the "P." of some peaks.
const MIN_NAME_LETTERS = 4;

/** Whether the name is only a type word or an abbreviation (HU-31), e.g. "Cerro" or "P.". */
export function isGenericName(name: string): boolean {
  const slug = slugify(name);
  return slug.replaceAll("-", "").length < MIN_NAME_LETTERS || GENERIC_NAMES.has(slug);
}

/** Whether the name is of infrastructure, not a tourist site. Matches whole slug words. */
export function isNonTouristName(name: string): boolean {
  const slug = `-${slugify(name)}-`;
  return NON_TOURIST_NAME_PARTS.some((part) => new RegExp(`-${part}[a-z]*-`).test(slug));
}

/** The first missing minimum field, in this order, or null when the site is valid. */
export function discardReasonOf(site: LocatedCandidate): DiscardReason | null {
  if (site.name === null) return "no-name";
  if (isGenericName(site.name)) return "generic-name";
  if (isNonTouristName(site.name)) return "not-tourist";
  if (site.placeTypeSlug === null) return "no-type";
  if (site.point === null) return "no-point";
  // The 42 municipalities cover exactly the department, so no municipality means outside it.
  if (site.municipalityId === null) return "outside-area";
  return null;
}

function isValid(site: LocatedCandidate): site is ValidSite {
  return discardReasonOf(site) === null;
}

/**
 * Keeps the sites with a real name, type, point and municipality (HU-24); the rest get their
 * reason.
 */
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
