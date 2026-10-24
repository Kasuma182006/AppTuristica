import { z } from "zod";
import { matchesAnySelector, type OsmTags } from "@/modules/catalogs/osm-tags";
import type { OsmTagSelector } from "@db/schema";
import { assertQueryCompleted, coordinates } from "./overpass";
import { buildOverpassQuery } from "./query";

// Protected areas in OSM: SINAP areas (national and regional parks, páramos, DRMI, forest reserves,
// Reservas Naturales de la Sociedad Civil) and national parks, which use their own boundary value.
export const PROTECTED_AREA_SELECTORS: readonly OsmTagSelector[] = [
  { boundary: "protected_area" },
  { leisure: "nature_reserve" },
  { boundary: "national_park" },
];

/** Cali's urban ecoparks are tagged as protected areas, but their sites are not fragile. */
function isEcopark(tags: OsmTags): boolean {
  return /ecoparque/i.test(tags.protection_title ?? "") || /^ecoparque\b/i.test(tags.name ?? "");
}

/** Whether an element is itself a protected area (e.g. a reserve), ecoparks excepted. */
export function isProtectedArea(tags: OsmTags): boolean {
  return matchesAnySelector(tags, PROTECTED_AREA_SELECTORS) && !isEcopark(tags);
}

export function buildProtectedAreasQuery(areaIds: readonly number[], timeoutSeconds: number) {
  return buildOverpassQuery(PROTECTED_AREA_SELECTORS, areaIds, timeoutSeconds, "geom");
}

/** A protected area as the lines of its ways; PostGIS assembles the polygons (ST_BuildArea). */
export interface ProtectedArea {
  externalId: string;
  name: string | null;
  /** Each line is a list of [lon, lat] positions (GeoJSON order). */
  lines: [number, number][][];
}

const tags = z.record(z.string(), z.string()).optional();
const id = z.number().int().positive();
const line = z.array(coordinates);

const protectedAreasResponseSchema = z.object({
  elements: z.array(
    z.discriminatedUnion("type", [
      // Point-only reserves have no area to contain other sites.
      z.object({ type: z.literal("node"), id, tags }),
      z.object({ type: z.literal("way"), id, tags, geometry: line.optional() }),
      z.object({
        type: z.literal("relation"),
        id,
        tags,
        members: z
          .array(
            z.discriminatedUnion("type", [
              z.object({ type: z.literal("way"), geometry: line.optional() }),
              z.object({ type: z.literal("node") }),
              z.object({ type: z.literal("relation") }),
            ]),
          )
          .optional(),
      }),
    ]),
  ),
  remark: z.string().optional(),
});

/** Parses `out geom` results into protected areas with lines, skipping ecoparks and points. */
export function parseProtectedAreas(body: unknown): ProtectedArea[] {
  const response = protectedAreasResponseSchema.parse(body);
  assertQueryCompleted(response.remark);

  return response.elements.flatMap((element) => {
    const elementTags = element.tags ?? {};
    if (element.type === "node" || !isProtectedArea(elementTags)) return [];
    const geometries =
      element.type === "way"
        ? [element.geometry ?? []]
        : (element.members ?? []).flatMap((m) => (m.type === "way" ? [m.geometry ?? []] : []));
    const lines = geometries
      .filter((g) => g.length >= 2)
      .map((g) => g.map((p): [number, number] => [p.lon, p.lat]));
    if (lines.length === 0) return [];
    return [{ externalId: `${element.type}/${element.id}`, name: elementTags.name ?? null, lines }];
  });
}
