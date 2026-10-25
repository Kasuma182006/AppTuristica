import type { statusEnum } from "@db/schema";
import type { LngLat } from "@db/schema/geometry";
import type { Catalog } from "../catalog";
import { claimSlug, siteSlug } from "./slug";
import type { Cost, Difficulty, ScoredSite, Sensitivity } from "./types";

export type PlaceStatus = (typeof statusEnum.enumValues)[number];
/** The place_sources kinds that ingest writes (community sources belong to proposals). */
export type IngestedSource = "openstreetmap" | "wikidata";

/** The places columns that ingest writes; slug, origin and status are handled apart. */
export interface PlaceFields {
  name: string;
  placeTypeId: number;
  municipalityId: number;
  location: LngLat;
  description: string | null;
  wikidataDescription: string | null;
  wikipediaUrl: string | null;
  difficulty: Difficulty | null;
  altitudeM: number | null;
  cost: Cost | null;
  sensitivity: Sensitivity;
  inProtectedArea: boolean;
  privateProperty: boolean;
  confidence: number;
}

export interface SourceRef {
  source: IngestedSource;
  externalId: string;
  url: string;
}

/** A Commons photo; its position in the list is its sort order (first = cover). */
export interface PhotoFields {
  url: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  width: number | null;
  height: number | null;
}

/** Everything ingest writes for one site. */
export interface PlaceData {
  fields: PlaceFields;
  activityIds: number[];
  sources: SourceRef[];
  photos: PhotoFields[];
}

/** A site saved by a previous run (origin open_data). */
export interface StoredPlace extends PlaceData {
  id: number;
  status: PlaceStatus;
}

export interface StoredState {
  /** Open-data sites by id. */
  places: ReadonlyMap<number, StoredPlace>;
  /** Slugs of every site, community ones included. */
  slugs: ReadonlySet<string>;
}

export interface PlaceCreate {
  slug: string;
  data: PlaceData;
}

export interface PlaceUpdate {
  id: number;
  data: PlaceData;
  /** Columns, activities or photos differ: rewrite them and bump updated_at. */
  contentChanged: boolean;
  activitiesChanged: boolean;
  photosChanged: boolean;
  /** Sources to add here, moving them from another site when they belonged to one. */
  newSources: SourceRef[];
  /** Wikidata items the site no longer links. */
  droppedWikidataIds: string[];
  /** Older sites merged into this one (HU-31): deleted once their sources move here. */
  absorbedIds: number[];
  /** An absorbed site was hidden: this one hides too, so the merge reactivates nothing. */
  hide: boolean;
}

export interface SavePlan {
  creates: PlaceCreate[];
  updates: PlaceUpdate[];
  /** Stored sites the run found unchanged, with the sources it saw. */
  unchanged: { id: number; sources: SourceRef[] }[];
}

const osmUrl = (externalId: string) => `https://www.openstreetmap.org/${externalId}`;
const wikidataUrl = (id: string) => `https://www.wikidata.org/wiki/${id}`;

function lookup<K extends string | number, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown ${what} "${key}" in the catalog`);
  return value;
}

/** The rows ingest writes for a site. */
export function placeDataOf(site: ScoredSite, catalog: Catalog): PlaceData {
  const typeIds = new Map(catalog.placeTypes.map((t) => [t.slug, t.id]));
  return {
    fields: {
      name: site.name,
      placeTypeId: lookup(typeIds, site.placeTypeSlug, "place type"),
      municipalityId: site.municipalityId,
      location: { lng: site.point.lon, lat: site.point.lat },
      description: site.description,
      wikidataDescription: site.wikidata?.description ?? null,
      wikipediaUrl: site.wikidata?.wikipediaUrl ?? null,
      difficulty: site.difficulty,
      altitudeM: site.altitudeM,
      cost: site.cost,
      sensitivity: site.sensitivity,
      inProtectedArea: site.inProtectedArea,
      privateProperty: site.privateProperty,
      confidence: site.confidence,
    },
    activityIds: site.activitySlugs.map((slug) => lookup(catalog.activityIds, slug, "activity")),
    sources: [
      ...site.elements.map((e) => ({
        source: "openstreetmap" as const,
        externalId: e.externalId,
        url: osmUrl(e.externalId),
      })),
      ...(site.wikidata
        ? [
            {
              source: "wikidata" as const,
              externalId: site.wikidata.id,
              url: wikidataUrl(site.wikidata.id),
            },
          ]
        : []),
    ],
    photos: site.photos.map((p) => ({
      url: p.url,
      author: p.author,
      license: p.license,
      licenseUrl: p.licenseUrl,
      sourceUrl: p.sourceUrl,
      width: p.width,
      height: p.height,
    })),
  };
}

function sameFields(a: PlaceFields, b: PlaceFields): boolean {
  const keys = Object.keys(a) as (keyof PlaceFields)[];
  return keys.every((key) =>
    key === "location"
      ? a.location.lng === b.location.lng && a.location.lat === b.location.lat
      : a[key] === b[key],
  );
}

function sameIds(a: readonly number[], b: readonly number[]): boolean {
  const sorted = (ids: readonly number[]) => [...ids].sort((x, y) => x - y).join(",");
  return sorted(a) === sorted(b);
}

function samePhotos(a: readonly PhotoFields[], b: readonly PhotoFields[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const sourceKey = (s: { source: string; externalId: string }) => `${s.source}:${s.externalId}`;

/**
 * Stored site of each run site, matched by OSM ids (HU-31). Each site takes the oldest (lowest
 * id) stored site holding one of its elements and not taken by another site; the other stored
 * sites it holds elements of are merged into it. Sites without a match are new.
 */
export function matchStoredPlaces(
  sites: readonly ScoredSite[],
  stored: StoredState,
): { placeOf: Map<number, number>; absorbedBy: Map<number, number[]> } {
  const owner = new Map<string, number>();
  for (const place of stored.places.values()) {
    for (const s of place.sources)
      if (s.source === "openstreetmap") owner.set(s.externalId, place.id);
  }

  const pairs: { site: number; place: number; count: number }[] = [];
  sites.forEach((site, i) => {
    const counts = new Map<number, number>();
    for (const e of site.elements) {
      const place = owner.get(e.externalId);
      if (place !== undefined) counts.set(place, (counts.get(place) ?? 0) + 1);
    }
    for (const [place, count] of counts) pairs.push({ site: i, place, count });
  });

  // Oldest stored site first; between sites claiming it, the one holding more of its elements.
  pairs.sort((a, b) => a.place - b.place || b.count - a.count || a.site - b.site);
  const placeOf = new Map<number, number>();
  const claimed = new Set<number>();
  for (const { site, place } of pairs) {
    if (placeOf.has(site) || claimed.has(place)) continue;
    placeOf.set(site, place);
    claimed.add(place);
  }

  const absorbedBy = new Map<number, number[]>();
  for (const { site, place } of [...pairs].sort((a, b) => b.count - a.count || a.site - b.site)) {
    if (claimed.has(place) || !placeOf.has(site)) continue;
    claimed.add(place);
    absorbedBy.set(site, [...(absorbedBy.get(site) ?? []), place]);
  }
  return { placeOf, absorbedBy };
}

/** What to write so the database matches the run: creations, updates and unchanged sites. */
export function planSave(
  sites: readonly ScoredSite[],
  stored: StoredState,
  catalog: Catalog,
): SavePlan {
  const { placeOf, absorbedBy } = matchStoredPlaces(sites, stored);
  const plan: SavePlan = { creates: [], updates: [], unchanged: [] };
  const newSites: { base: string; firstId: string; data: PlaceData }[] = [];

  sites.forEach((site, i) => {
    const data = placeDataOf(site, catalog);
    const placeId = placeOf.get(i);
    const current = placeId === undefined ? undefined : stored.places.get(placeId);
    if (!current) {
      const municipality = lookup(catalog.municipalities, site.municipalityId, "municipality");
      newSites.push({
        base: siteSlug(site.name, municipality.slug),
        firstId: site.elements[0]?.externalId ?? "",
        data,
      });
      return;
    }

    const absorbedIds = absorbedBy.get(i) ?? [];
    const hide =
      current.status !== "hidden" &&
      absorbedIds.some((id) => stored.places.get(id)?.status === "hidden");
    const activitiesChanged = !sameIds(current.activityIds, data.activityIds);
    const photosChanged = !samePhotos(current.photos, data.photos);
    const contentChanged =
      !sameFields(current.fields, data.fields) || activitiesChanged || photosChanged;
    const storedKeys = new Set(current.sources.map(sourceKey));
    const desiredKeys = new Set(data.sources.map(sourceKey));
    const update: PlaceUpdate = {
      id: current.id,
      data,
      contentChanged,
      activitiesChanged,
      photosChanged,
      newSources: data.sources.filter((s) => !storedKeys.has(sourceKey(s))),
      droppedWikidataIds: current.sources
        .filter((s) => s.source === "wikidata" && !desiredKeys.has(sourceKey(s)))
        .map((s) => s.externalId),
      absorbedIds,
      hide,
    };
    const changed =
      contentChanged ||
      hide ||
      update.newSources.length > 0 ||
      update.droppedWikidataIds.length > 0 ||
      absorbedIds.length > 0;
    if (changed) plan.updates.push(update);
    else plan.unchanged.push({ id: current.id, sources: data.sources });
  });

  // Stable order, so the same run gives the same "-2" suffixes.
  newSites.sort((a, b) => a.base.localeCompare(b.base) || a.firstId.localeCompare(b.firstId));
  const taken = new Set(stored.slugs);
  for (const site of newSites) {
    plan.creates.push({ slug: claimSlug(site.base, taken), data: site.data });
  }
  return plan;
}
