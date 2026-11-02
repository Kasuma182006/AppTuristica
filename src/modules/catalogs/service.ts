import { getDb } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/slug";
import { locatePoints, type Location } from "./locate";
import {
  findCatalogs,
  findMunicipalityBounds,
  findMunicipalityById,
  findMunicipalityBySlug,
} from "./repository";
import type { Bounds, CatalogItem, Catalogs, Municipality } from "./types";

/**
 * The municipality a point falls in, with the point itself, moved inside when it was just off the
 * border (HU-80). Null when the point is outside every municipality.
 */
export async function locateInMunicipality(
  point: Location["point"],
): Promise<(CatalogItem & Location) | null> {
  const db = getDb();
  const [location] = await locatePoints(db, [point]);
  if (!location) return null;
  const municipality = await findMunicipalityById(db, location.municipalityId);
  return municipality ? { ...municipality, ...location } : null;
}

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
