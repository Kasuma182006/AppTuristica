import { getDb } from "@/lib/db";
import { getCatalogs } from "@/modules/catalogs/service";
import { findUnknownSlug, type ParseResult } from "./filters";
import { findPlaces, type PlaceRow } from "./repository";
import {
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  type Difficulty,
  type DifficultySlug,
  type Origin,
  type OriginSlug,
  type PlaceFilters,
  type PlaceSummary,
} from "./types";

const slugByDifficulty = new Map(
  Object.entries(DIFFICULTY_SLUGS).map(([slug, value]) => [value, slug as DifficultySlug]),
) as ReadonlyMap<Difficulty, Exclude<DifficultySlug, "sin-dato">>;

const slugByOrigin = new Map(
  Object.entries(ORIGIN_SLUGS).map(([slug, value]) => [value, slug as OriginSlug]),
) as ReadonlyMap<Origin, OriginSlug>;

/** The public shape of a site in search results, with Spanish filter values. */
export function toPlaceSummary(row: PlaceRow): PlaceSummary {
  const origin = slugByOrigin.get(row.origin);
  if (!origin) throw new Error(`No slug for origin ${row.origin}`);

  return {
    slug: row.slug,
    name: row.name,
    municipality: row.municipality,
    placeType: row.placeType,
    activities: row.activities,
    difficulty: row.difficulty ? (slugByDifficulty.get(row.difficulty) ?? null) : null,
    origin,
    restricted: row.inProtectedArea || row.privateProperty,
    confidence: row.confidence,
  };
}

/**
 * Published sites matching the filters (HU-36), for the web and `GET /api/v1/places`.
 * Fails when a filter names a municipality, type or activity that does not exist.
 */
export async function searchPlaces(filters: PlaceFilters): Promise<ParseResult<PlaceSummary[]>> {
  const unknown = findUnknownSlug(filters, await getCatalogs());
  if (unknown) return { ok: false, message: unknown };

  const rows = await findPlaces(getDb(), filters);
  return { ok: true, value: rows.map(toPlaceSummary) };
}
