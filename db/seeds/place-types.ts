import { sql } from "drizzle-orm";
import { placeTypes, type OsmTagSelector } from "@db/schema";
import { osmTagSelectorsSchema } from "@/modules/catalogs/osm-tags";
import { emptySeedResult, recordUpsert, type SeedDb, type SeedResult } from "./common";

export interface PlaceTypeSource {
  slug: string;
  name: string;
  osmTags: OsmTagSelector[];
}

// Place types (HU-11), in display and classification priority order: when an OSM element matches
// several types, the first one wins. Tags follow https://wiki.openstreetmap.org/wiki/Map_features.
export const PLACE_TYPES: readonly PlaceTypeSource[] = [
  {
    slug: "cascada",
    name: "Cascada",
    osmTags: [{ natural: "waterfall" }, { waterway: "waterfall" }],
  },
  {
    slug: "rio",
    name: "Río",
    osmTags: [{ waterway: "river" }],
  },
  {
    slug: "mirador",
    name: "Mirador",
    osmTags: [{ tourism: "viewpoint" }],
  },
  {
    slug: "cerro",
    name: "Cerro o pico",
    osmTags: [{ natural: "peak" }, { natural: "volcano" }, { natural: "hill" }],
  },
  {
    slug: "sendero",
    name: "Sendero",
    // Only mountain paths (with a difficulty grade): plain highway=path includes urban paths.
    osmTags: [{ route: "hiking" }, { highway: "path", sac_scale: "*" }],
  },
  {
    slug: "lago",
    name: "Lago o laguna",
    osmTags: [
      { natural: "water", water: "lake" },
      { natural: "water", water: "lagoon" },
      // Reservoirs such as Lago Calima; landuse=reservoir is the older tagging.
      { natural: "water", water: "reservoir" },
      { landuse: "reservoir" },
    ],
  },
  {
    slug: "reserva-natural",
    name: "Reserva natural",
    osmTags: [{ leisure: "nature_reserve" }, { boundary: "protected_area" }],
  },
  {
    slug: "balneario",
    name: "Balneario",
    osmTags: [{ leisure: "swimming_area" }, { leisure: "bathing_place" }],
  },
  {
    // Not in the HU-11 list; added at the user's request for Pacific beaches (Juanchaco, Ladrilleros).
    slug: "playa",
    name: "Playa",
    osmTags: [{ natural: "beach" }],
  },
];

/** Upserts every place type by slug, keeping list order as `sort_order`. Safe to run repeatedly. */
export async function seedPlaceTypes(db: SeedDb): Promise<SeedResult> {
  const result = emptySeedResult();

  for (const [index, placeType] of PLACE_TYPES.entries()) {
    const osmTags = osmTagSelectorsSchema.parse(placeType.osmTags);
    const rows = await db
      .insert(placeTypes)
      .values({ slug: placeType.slug, name: placeType.name, sortOrder: index + 1, osmTags })
      .onConflictDoUpdate({
        target: placeTypes.slug,
        set: {
          name: sql`excluded.name`,
          sortOrder: sql`excluded.sort_order`,
          osmTags: sql`excluded.osm_tags`,
          updatedAt: sql`now()`,
        },
        // Skip the write when nothing changed, so updated_at reflects real data changes.
        setWhere: sql`(${placeTypes.name}, ${placeTypes.sortOrder}, ${placeTypes.osmTags})
          IS DISTINCT FROM (excluded.name, excluded.sort_order, excluded.osm_tags)`,
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });

    recordUpsert(result, placeType.slug, rows);
  }

  return result;
}
