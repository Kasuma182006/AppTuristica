import { eq, like, or, sql, type SQL } from "drizzle-orm";
import { places } from "@db/schema";
import type { Db } from "@/lib/db";
import { claimSlug, siteSlug } from "@/lib/slug";
import type { Cost, Sensitivity } from "@/modules/places/types";

/** A site proposed by the community, ready to save. */
export interface NewCommunityPlace {
  name: string;
  placeTypeSlug: string;
  activitySlugs: string[];
  municipalitySlug: string;
  municipalityId: number;
  location: { lat: number; lng: number };
  description: string;
  cost: Cost | null;
  sensitivity: Sensitivity;
  confidence: number;
}

/** How many times to try again when another proposal took the same address at the same moment. */
const SLUG_ATTEMPTS = 3;

/** Whether a database error is a broken unique rule, wherever Drizzle wrapped it. */
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ("code" in current && current.code === "23505") return true;
  }
  return false;
}

/** The first free address of a site, looking at every site, hidden ones too. */
async function freeSlug(db: Db, base: string): Promise<string> {
  const rows = await db
    .select({ slug: places.slug })
    .from(places)
    .where(or(eq(places.slug, base), like(places.slug, `${base}-%`)));
  return claimSlug(base, new Set(rows.map((row) => row.slug)));
}

/**
 * The site with its activities and source, as one statement, so it is all or nothing without a
 * transaction: db.transaction does not work with the app's client (see src/lib/db.ts). An unknown
 * place type leaves place_type_id empty, which the database rejects; the trigger of migration 0006
 * still checks that the point is inside the municipality.
 */
export function insertPlaceStatement(place: NewCommunityPlace, slug: string): SQL {
  const { lat, lng } = place.location;
  return sql`
    WITH created AS (
      INSERT INTO places (
        slug, name, place_type_id, municipality_id, location, description, cost, sensitivity,
        origin, confidence
      )
      VALUES (
        ${slug},
        ${place.name},
        (SELECT id FROM place_types WHERE slug = ${place.placeTypeSlug}),
        ${place.municipalityId},
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326),
        ${place.description},
        ${place.cost},
        ${place.sensitivity},
        'community',
        ${place.confidence}
      )
      RETURNING id
    ),
    linked_activities AS (
      INSERT INTO place_activities (place_id, activity_id)
      SELECT created.id, activities.id
      FROM created
      CROSS JOIN activities
      WHERE activities.slug IN (
        SELECT jsonb_array_elements_text(${JSON.stringify(place.activitySlugs)}::jsonb)
      )
    ),
    linked_source AS (
      INSERT INTO place_sources (place_id, source)
      SELECT created.id, 'community' FROM created
    )
    SELECT id FROM created
  `;
}

/** Publishes a proposed site (HU-83) and returns its address. */
export async function saveCommunityPlace(db: Db, place: NewCommunityPlace): Promise<string> {
  const base = siteSlug(place.name, place.municipalitySlug);
  for (let attempt = 1; ; attempt++) {
    const slug = await freeSlug(db, base);
    try {
      await db.execute(insertPlaceStatement(place, slug));
      return slug;
    } catch (error) {
      if (attempt >= SLUG_ATTEMPTS || !isUniqueViolation(error)) throw error;
    }
  }
}
