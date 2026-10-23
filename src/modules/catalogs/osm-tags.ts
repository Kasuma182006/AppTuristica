import { z } from "zod";
import type { OsmTagSelector } from "@db/schema";

export type { OsmTagSelector };

/** Value meaning "the key is present, with any value". */
export const ANY_VALUE = "*";

const osmKey = z.string().regex(/^[a-z0-9_:]+$/, "OSM keys are lowercase, e.g. sac_scale");

export const osmTagSelectorSchema = z
  .record(osmKey, z.string().min(1))
  .refine((selector) => Object.keys(selector).length > 0, "a selector needs at least one tag");

export const osmTagSelectorsSchema = z.array(osmTagSelectorSchema).min(1);

export type OsmTags = Readonly<Record<string, string>>;

export function matchesSelector(tags: OsmTags, selector: OsmTagSelector): boolean {
  return Object.entries(selector).every(([key, value]) => {
    const actual = tags[key];
    return actual !== undefined && (value === ANY_VALUE || actual === value);
  });
}

export function matchesAnySelector(tags: OsmTags, selectors: readonly OsmTagSelector[]): boolean {
  return selectors.some((selector) => matchesSelector(tags, selector));
}

/**
 * Returns the first type (in priority order) whose selectors match the element's tags,
 * e.g. a peak that is also tagged as a viewpoint becomes whichever type comes first.
 */
export function classifyByOsmTags<T extends { osmTags: readonly OsmTagSelector[] }>(
  tags: OsmTags,
  typesInPriorityOrder: readonly T[],
): T | undefined {
  return typesInPriorityOrder.find((type) => matchesAnySelector(tags, type.osmTags));
}
