import { matchesAnySelector, type OsmTagSelector, type OsmTags } from "./osm-tags";

export interface ActivityRule {
  slug: string;
  /** Place type slugs whose sites always get the activity. */
  placeTypes: readonly string[];
  /** OSM tag selectors; matching any of them gives the activity. */
  osmTags: readonly OsmTagSelector[];
}

/**
 * Activities a site gets from its type and OSM tags, in the order of `rulesInDisplayOrder`
 * (e.g. a "sendero" tagged `mtb:scale=1` → senderismo and ciclismo).
 */
export function deriveActivities(
  placeTypeSlug: string,
  tags: OsmTags,
  rulesInDisplayOrder: readonly ActivityRule[],
): string[] {
  return rulesInDisplayOrder
    .filter(
      (rule) => rule.placeTypes.includes(placeTypeSlug) || matchesAnySelector(tags, rule.osmTags),
    )
    .map((rule) => rule.slug);
}
