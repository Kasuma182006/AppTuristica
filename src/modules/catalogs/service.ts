import { getDb } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/slug";
import { findCatalogs, findMunicipalityBySlug } from "./repository";
import type { Catalogs, Municipality } from "./types";

/** Filter values for the web and `GET /api/v1/catalogs` (HU-35). */
export function getCatalogs(): Promise<Catalogs> {
  return findCatalogs(getDb());
}

/** A municipality by slug (HU-70), with or without published sites; undefined when unknown. */
export async function getMunicipality(slug: string): Promise<Municipality | undefined> {
  if (!SLUG_PATTERN.test(slug)) return undefined;
  return findMunicipalityBySlug(getDb(), slug);
}
