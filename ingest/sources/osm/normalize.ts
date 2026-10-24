import { deriveActivities } from "@/modules/catalogs/activities";
import { classifyByOsmTags, type OsmTags } from "@/modules/catalogs/osm-tags";
import type { Catalog } from "../../catalog";
import type { CandidatePlace, Cost, Difficulty } from "../../pipeline/types";
import type { OsmElement } from "./overpass";

const ALTITUDE_MIN_M = -500;
const ALTITUDE_MAX_M = 9000;
const METERS_PER_FOOT = 0.3048;

/** `name:es` when present (e.g. an indigenous name in `name`), else `name`; whitespace collapsed. */
export function nameFromTags(tags: OsmTags): string | null {
  for (const key of ["name:es", "name"]) {
    const name = tags[key]?.replace(/\s+/g, " ").trim();
    if (name) return name;
  }
  return null;
}

// SAC scale (https://wiki.openstreetmap.org/wiki/Key:sac_scale): T1 easy, T2–T3 moderate,
// T4–T6 (alpine terrain) hard.
const SAC_SCALE_DIFFICULTY: Readonly<Record<string, Difficulty>> = {
  hiking: "easy",
  mountain_hiking: "moderate",
  demanding_mountain_hiking: "moderate",
  alpine_hiking: "hard",
  demanding_alpine_hiking: "hard",
  difficult_alpine_hiking: "hard",
  t1: "easy",
  t2: "moderate",
  t3: "moderate",
  t4: "hard",
  t5: "hard",
  t6: "hard",
};

export function difficultyFromSacScale(value: string | undefined): Difficulty | null {
  if (value === undefined) return null;
  return SAC_SCALE_DIFFICULTY[value.trim().toLowerCase()] ?? null;
}

/** `fee=no` → free; `fee=yes` or a price → paid ("0 COP" → free); anything else → unknown. */
export function costFromFee(value: string | undefined): Cost | null {
  const fee = value?.trim().toLowerCase();
  if (!fee) return null;
  if (fee === "no") return "free";
  if (fee === "yes") return "paid";
  const amounts = fee.match(/\d+/g);
  if (amounts === null) return null;
  return amounts.every((amount) => Number(amount) === 0) ? "free" : "paid";
}

/** "1550", "1550.4", "1.550" (thousands), "1550,4", in meters by default. */
function parseAmount(text: string): number | null {
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ""));
  if (/^-?\d+([.,]\d+)?$/.test(text)) return Number(text.replace(",", "."));
  return null;
}

/** Altitude in whole meters from `ele` ("1550", "1550 m", "1.550", "5000 ft"); null if unclear. */
export function altitudeFromEle(value: string | undefined): number | null {
  const match = value
    ?.trim()
    .toLowerCase()
    .match(/^(-?[\d.,]+)\s*(m|ft|feet)?$/);
  if (!match?.[1]) return null;
  const amount = parseAmount(match[1]);
  if (amount === null) return null;

  const meters = Math.round(
    match[2] === "ft" || match[2] === "feet" ? amount * METERS_PER_FOOT : amount,
  );
  return meters >= ALTITUDE_MIN_M && meters <= ALTITUDE_MAX_M ? meters : null;
}

export function externalIdOf(element: Pick<OsmElement, "type" | "id">): string {
  return `${element.type}/${element.id}`;
}

/** The Wikidata item id in `wikidata` ("Q123"); null when missing or malformed. */
export function wikidataIdFromTags(tags: OsmTags): string | null {
  const id = tags.wikidata?.trim().toUpperCase();
  return id !== undefined && /^Q[1-9][0-9]*$/.test(id) ? id : null;
}

/** Converts one OSM element into a candidate site, classified with the catalog's rules. */
export function normalizeOsmElement(element: OsmElement, catalog: Catalog): CandidatePlace {
  const { tags } = element;
  const placeTypeSlug = classifyByOsmTags(tags, catalog.placeTypes)?.slug ?? null;
  return {
    name: nameFromTags(tags),
    placeTypeSlug,
    difficulty: difficultyFromSacScale(tags.sac_scale),
    altitudeM: altitudeFromEle(tags.ele),
    cost: costFromFee(tags.fee),
    activitySlugs:
      placeTypeSlug === null ? [] : deriveActivities(placeTypeSlug, tags, catalog.activityRules),
    wikidataId: wikidataIdFromTags(tags),
    elements: [{ externalId: externalIdOf(element), point: element.point, tags }],
  };
}
