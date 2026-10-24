import { slugify } from "@/lib/slug";
import type { CandidatePlace, Discarded, DiscardReason } from "../../pipeline/types";

// Place type slug of rivers (db/seeds/place-types.ts).
export const RIVER_TYPE_SLUG = "rio";

/** Canals mistagged as waterway=river, e.g. "Canal CVC Sur". */
export function isCanalName(name: string): boolean {
  const slug = slugify(name);
  return slug === "canal" || slug.startsWith("canal-");
}

function isRelation(candidate: CandidatePlace): boolean {
  return candidate.elements.some((e) => e.externalId.startsWith("relation/"));
}

/** The spelling used by most segments; ties go to the first one seen. */
function mostCommonName(names: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  let best = names[0] ?? "";
  for (const [name, count] of counts) if (count > (counts.get(best) ?? 0)) best = name;
  return best;
}

function mergeSegments(
  segments: readonly CandidatePlace[],
  activityOrder: readonly string[],
): CandidatePlace {
  const firstValue = <K extends "difficulty" | "altitudeM" | "cost">(key: K) =>
    segments.map((s) => s[key]).find((value) => value !== null) ?? null;
  const activitySlugs = [...new Set(segments.flatMap((s) => s.activitySlugs))].sort(
    (a, b) => activityOrder.indexOf(a) - activityOrder.indexOf(b),
  );
  return {
    name: mostCommonName(segments.map((s) => s.name ?? "")),
    placeTypeSlug: RIVER_TYPE_SLUG,
    difficulty: firstValue("difficulty"),
    altitudeM: firstValue("altitudeM"),
    cost: firstValue("cost"),
    activitySlugs,
    elements: segments.flatMap((s) => s.elements),
  };
}

function discard(candidate: CandidatePlace, reason: DiscardReason): Discarded {
  return {
    externalIds: candidate.elements.map((e) => e.externalId),
    name: candidate.name,
    reason,
  };
}

/**
 * OSM splits a river into many ways. Joins the named segments of each river (same name, ignoring
 * case and accents) into one candidate that keeps every segment's point, so HU-23 can make one
 * site per river and municipality. River relations are dropped: they repeat their ways and their
 * center does not represent the river. Canals tagged as rivers are dropped too. Unnamed segments
 * stay as they are (HU-24 discards them).
 */
export function groupRiverSegments(
  candidates: readonly CandidatePlace[],
  activityOrder: readonly string[],
): { candidates: CandidatePlace[]; discarded: Discarded[] } {
  const result: CandidatePlace[] = [];
  const discarded: Discarded[] = [];
  const rivers = new Map<string, CandidatePlace[]>();

  for (const candidate of candidates) {
    if (candidate.placeTypeSlug !== RIVER_TYPE_SLUG) {
      result.push(candidate);
    } else if (isRelation(candidate)) {
      discarded.push(discard(candidate, "river-relation"));
    } else if (candidate.name === null) {
      result.push(candidate);
    } else if (isCanalName(candidate.name)) {
      discarded.push(discard(candidate, "canal"));
    } else {
      const key = slugify(candidate.name);
      rivers.set(key, [...(rivers.get(key) ?? []), candidate]);
    }
  }

  for (const segments of rivers.values()) result.push(mergeSegments(segments, activityOrder));
  return { candidates: result, discarded };
}
