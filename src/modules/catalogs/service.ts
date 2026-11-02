import { getDb } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/slug";
import { findCatalogs, findMunicipalityBounds, findMunicipalityBySlug } from "./repository";
import type { Bounds, Catalogs, Municipality } from "./types";

/** The area of each municipality, by slug, to move a map there (HU-75). */
export function getMunicipalityBounds(): Promise<Record<string, Bounds>> {
  return findMunicipalityBounds(getDb());
}

/** Filter values for the web and `GET /api/v1/catalogs` (HU-35). */
export function getCatalogs(): Promise<Catalogs> {
  return findCatalogs(getDb());
}

/** A municipality by slug (HU-70), with or without published sites; undefined when unknown. */
export async function getMunicipality(slug: string): Promise<Municipality | undefined> {
  if (!SLUG_PATTERN.test(slug)) return undefined;
  return findMunicipalityBySlug(getDb(), slug);
}
