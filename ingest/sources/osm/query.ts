import { ANY_VALUE, type OsmTagSelector } from "@/modules/catalogs/osm-tags";

// Overpass derives area ids from relation ids: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#By_area_.28area.29
const RELATION_AREA_OFFSET = 3_600_000_000;

export function areaIdForRelation(relationId: number): number {
  return RELATION_AREA_OFFSET + relationId;
}

/** Quotes an OSM key or value for Overpass QL. */
function quote(text: string): string {
  return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/** `{ highway: "path", sac_scale: "*" }` → `["highway"="path"]["sac_scale"]`. */
export function selectorFilter(selector: OsmTagSelector): string {
  return Object.entries(selector)
    .map(([key, value]) =>
      value === ANY_VALUE ? `[${quote(key)}]` : `[${quote(key)}=${quote(value)}]`,
    )
    .join("");
}

/**
 * Builds the Overpass QL query for every element (node, way or relation) matching any selector
 * inside the given areas. By default ways and relations come with their center only
 * (`out tags center`): a site is stored as a point. `geom` returns full geometries instead.
 */
export function buildOverpassQuery(
  selectors: readonly OsmTagSelector[],
  areaIds: readonly number[],
  timeoutSeconds: number,
  output: "tags center" | "geom" = "tags center",
): string {
  if (selectors.length === 0) throw new Error("No OSM tag selectors to query");
  if (areaIds.length === 0) throw new Error("No areas to query");

  const filters = [...new Set(selectors.map(selectorFilter))];
  return [
    `[out:json][timeout:${timeoutSeconds}];`,
    `area(id:${areaIds.join(",")})->.scope;`,
    "(",
    ...filters.map((filter) => `  nwr${filter}(area.scope);`),
    ");",
    `out ${output};`,
  ].join("\n");
}
