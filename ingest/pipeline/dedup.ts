import { slugify } from "@/lib/slug";
import type { Point, RestrictedSite } from "./types";

/** Sites closer than this, of the same type and with similar names, are the same place. */
export const DUPLICATE_DISTANCE_M = 200;
// Place type slug of protected areas (db/seeds/place-types.ts).
const RESERVE_TYPE_SLUG = "reserva-natural";
const EARTH_RADIUS_M = 6_371_000;

export function distanceM(a: Point, b: Point): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Equal, or one contained in the other as whole words, ignoring case, accents and punctuation:
 * "Laguna de Sonso" ~ "DRMI Laguna de Sonso o del Chircal", but "Cascada 1" ≁ "Cascada 12".
 */
export function similarNames(a: string, b: string): boolean {
  const [short, long] = [slugify(a), slugify(b)].sort((x, y) => x.length - y.length);
  if (!short || !long) return false;
  return `-${long}-`.includes(`-${short}-`);
}

export interface DedupOptions {
  /** Activity slugs in display order, to keep merged activities sorted. */
  activityOrder: readonly string[];
  /** External ids of the protected areas covering each site's point, aligned with the sites. */
  containingAreas: readonly (readonly string[])[];
}

/** A merge for the run log: the site that was kept and the external ids folded into it. */
export interface Merge {
  kept: RestrictedSite;
  mergedExternalIds: string[];
}

/** Number of optional fields with data: the more, the better the site to keep. */
function filledFields(site: RestrictedSite): number {
  return [site.difficulty, site.altitudeM, site.cost].filter((value) => value !== null).length;
}

function firstNumericId(site: RestrictedSite): number {
  return Number(site.elements[0]?.externalId.split("/")[1] ?? Infinity);
}

/** Keep order: more data first, then a node (exact point), then the lowest OSM id. */
function compareForKeeping(a: RestrictedSite, b: RestrictedSite): number {
  const isNode = (s: RestrictedSite) => (s.elements[0]?.externalId.startsWith("node/") ? 0 : 1);
  return (
    filledFields(b) - filledFields(a) ||
    isNode(a) - isNode(b) ||
    firstNumericId(a) - firstNumericId(b)
  );
}

function mergeGroup(
  group: readonly RestrictedSite[],
  activityOrder: readonly string[],
): RestrictedSite {
  const [kept, ...rest] = [...group].sort(compareForKeeping);
  if (kept === undefined) throw new Error("Cannot merge an empty group");
  const firstValue = <K extends "difficulty" | "altitudeM" | "cost">(key: K) =>
    [kept, ...rest].map((s) => s[key]).find((value) => value !== null) ?? null;
  const inProtectedArea = group.some((s) => s.inProtectedArea);
  return {
    ...kept,
    difficulty: firstValue("difficulty"),
    altitudeM: firstValue("altitudeM"),
    cost: firstValue("cost"),
    activitySlugs: [...new Set(group.flatMap((s) => s.activitySlugs))].sort(
      (a, b) => activityOrder.indexOf(a) - activityOrder.indexOf(b),
    ),
    // The kept site's elements first: its first element still represents it.
    elements: [kept, ...rest].flatMap((s) => s.elements),
    inProtectedArea,
    privateProperty: group.some((s) => s.privateProperty),
    sensitivity: inProtectedArea ? "fragile" : "normal",
  };
}

/**
 * Merges duplicates within a run (HU-26): same type, similar names, and either closer than
 * DUPLICATE_DISTANCE_M or, for protected areas, one's point inside the other's polygon (large
 * parks can come twice, far apart). Duplicates chain: if A~B and B~C, all three merge. The kept
 * site's name, point and municipality stay; activities and sources add up; missing fields are
 * filled from the others; fragile or private if any of them was.
 */
export function deduplicate(
  sites: readonly RestrictedSite[],
  options: DedupOptions,
): { sites: RestrictedSite[]; merges: Merge[] } {
  // Union-find over site indexes (a few hundred sites: no path compression needed).
  const parent = sites.map((_, i) => i);
  const root = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] ?? r;
    return r;
  };
  const insideOther = (i: number, j: number) => {
    const areas = new Set(options.containingAreas[i] ?? []);
    return sites[j]?.elements.some((e) => areas.has(e.externalId)) ?? false;
  };

  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const a = sites[i];
      const b = sites[j];
      if (!a || !b || a.placeTypeSlug !== b.placeTypeSlug || !similarNames(a.name, b.name))
        continue;
      const near = distanceM(a.point, b.point) < DUPLICATE_DISTANCE_M;
      const sameArea =
        a.placeTypeSlug === RESERVE_TYPE_SLUG && (insideOther(i, j) || insideOther(j, i));
      if (near || sameArea) parent[root(j)] = root(i);
    }
  }

  const groups = new Map<number, RestrictedSite[]>();
  sites.forEach((site, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), site]));

  const result: RestrictedSite[] = [];
  const merges: Merge[] = [];
  for (const group of groups.values()) {
    if (group.length === 1 && group[0]) {
      result.push(group[0]);
      continue;
    }
    const merged = mergeGroup(group, options.activityOrder);
    const keptIds = new Set(
      [...group].sort(compareForKeeping)[0]?.elements.map((e) => e.externalId),
    );
    result.push(merged);
    merges.push({
      kept: merged,
      mergedExternalIds: merged.elements.map((e) => e.externalId).filter((id) => !keptIds.has(id)),
    });
  }
  return { sites: result, merges };
}

/** One log line: `Laguna de Sonso o del Chircal [way/1] ← relation/2`. */
export function formatMerge(merge: Merge): string {
  const keptIds = merge.kept.elements
    .map((e) => e.externalId)
    .filter((id) => !merge.mergedExternalIds.includes(id));
  return `${merge.kept.name} [${keptIds.join(", ")}] ← ${merge.mergedExternalIds.join(", ")}`;
}
