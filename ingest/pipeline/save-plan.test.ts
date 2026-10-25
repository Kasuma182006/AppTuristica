import { describe, expect, it } from "vitest";
import type { Catalog } from "../catalog";
import {
  matchStoredPlaces,
  placeDataOf,
  planSave,
  type StoredPlace,
  type StoredState,
} from "./save-plan";
import type { ScoredSite } from "./types";

const catalog: Catalog = {
  placeTypes: [
    { id: 1, slug: "cascada", osmTags: [] },
    { id: 2, slug: "rio", osmTags: [] },
  ],
  activityRules: [],
  activityIds: new Map([
    ["senderismo", 10],
    ["fotografia", 11],
  ]),
  municipalities: new Map([
    [3, { name: "Dagua", slug: "dagua", departmentName: "Valle del Cauca" }],
    [4, { name: "Cali", slug: "cali", departmentName: "Valle del Cauca" }],
  ]),
};

const point = { lat: 3.6, lon: -76.7 };

function site(externalIds: string[], overrides: Partial<ScoredSite> = {}): ScoredSite {
  return {
    name: "Cascada La Chorrera",
    placeTypeSlug: "cascada",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: ["senderismo"],
    wikidataId: null,
    elements: externalIds.map((externalId) => ({ externalId, point, tags: {} })),
    point,
    municipalityId: 3,
    inProtectedArea: false,
    privateProperty: false,
    sensitivity: "normal",
    wikidata: null,
    photos: [],
    description: "Cascada en Dagua, Valle del Cauca.",
    confidence: 30,
    ...overrides,
  };
}

const wikidata = {
  id: "Q853332",
  description: "río de Colombia",
  wikipediaUrl: "https://es.wikipedia.org/wiki/R%C3%ADo_Cauca",
  image: null,
  commonsCategory: null,
};

const photo = {
  url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Chorrera.jpg",
  author: "Autor",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Chorrera.jpg",
  width: 800,
  height: 600,
};

/** A stored site exactly as `site` would save it. */
function stored(id: number, from: ScoredSite, overrides: Partial<StoredPlace> = {}): StoredPlace {
  return { id, status: "published", ...placeDataOf(from, catalog), ...overrides };
}

function state(placesList: StoredPlace[], slugs: string[] = []): StoredState {
  return { places: new Map(placesList.map((p) => [p.id, p])), slugs: new Set(slugs) };
}

describe("placeDataOf", () => {
  it("maps a site to its columns, activities, sources and photos", () => {
    const data = placeDataOf(
      site(["way/1", "way/2"], { wikidata, photos: [photo], altitudeM: 1200 }),
      catalog,
    );
    expect(data.fields).toMatchObject({
      name: "Cascada La Chorrera",
      placeTypeId: 1,
      municipalityId: 3,
      location: { lng: -76.7, lat: 3.6 },
      wikidataDescription: "río de Colombia",
      wikipediaUrl: "https://es.wikipedia.org/wiki/R%C3%ADo_Cauca",
      altitudeM: 1200,
      confidence: 30,
    });
    expect(data.activityIds).toEqual([10]);
    expect(data.sources).toEqual([
      { source: "openstreetmap", externalId: "way/1", url: "https://www.openstreetmap.org/way/1" },
      { source: "openstreetmap", externalId: "way/2", url: "https://www.openstreetmap.org/way/2" },
      { source: "wikidata", externalId: "Q853332", url: "https://www.wikidata.org/wiki/Q853332" },
    ]);
    expect(data.photos).toEqual([photo]);
  });

  it("fails on a type or activity missing from the catalog", () => {
    expect(() => placeDataOf(site(["node/1"], { placeTypeSlug: "volcan" }), catalog)).toThrow(
      'Unknown place type "volcan"',
    );
    expect(() => placeDataOf(site(["node/1"], { activitySlugs: ["buceo"] }), catalog)).toThrow(
      'Unknown activity "buceo"',
    );
  });
});

describe("planSave", () => {
  it("creates new sites with name-municipality slugs, numbered when taken", () => {
    const plan = planSave(
      [
        site(["node/2"]),
        site(["node/1"]),
        site(["way/5"], { name: "Río Cali", placeTypeSlug: "rio", municipalityId: 4 }),
      ],
      state([], ["rio-cali"]),
      catalog,
    );
    expect(plan.creates.map((c) => c.slug)).toEqual([
      "cascada-la-chorrera-dagua",
      "cascada-la-chorrera-dagua-2",
      "rio-cali-2",
    ]);
    // Ordered by slug and then OSM id, so reruns give the same suffixes.
    expect(plan.creates[0]?.data.sources[0]?.externalId).toBe("node/1");
    expect(plan.updates).toEqual([]);
  });

  it("leaves a stored site unchanged when the run finds the same data", () => {
    const current = site(["node/1"], { wikidata, photos: [photo] });
    const plan = planSave([current], state([stored(7, current)]), catalog);
    expect(plan.creates).toEqual([]);
    expect(plan.updates).toEqual([]);
    expect(plan.unchanged).toEqual([{ id: 7, sources: placeDataOf(current, catalog).sources }]);
  });

  it("updates the columns, activities and photos that changed", () => {
    const before = site(["node/1"]);
    const after = site(["node/1"], {
      altitudeM: 1500,
      activitySlugs: ["fotografia", "senderismo"],
      photos: [photo],
    });
    const [update] = planSave([after], state([stored(7, before)]), catalog).updates;
    expect(update).toMatchObject({
      id: 7,
      contentChanged: true,
      activitiesChanged: true,
      photosChanged: true,
      newSources: [],
      hide: false,
    });

    const reordered = site(["node/1"], { activitySlugs: ["senderismo"] });
    expect(planSave([reordered], state([stored(7, before)]), catalog).unchanged).toHaveLength(1);
  });

  it("adds new sources and drops Wikidata items the site no longer links", () => {
    const before = site(["node/1"], { wikidata });
    const after = site(["node/1", "node/2"], { wikidata: { ...wikidata, id: "Q1" } });
    const [update] = planSave([after], state([stored(7, before)]), catalog).updates;
    expect(update?.newSources.map((s) => s.externalId)).toEqual(["node/2", "Q1"]);
    expect(update?.droppedWikidataIds).toEqual(["Q853332"]);
  });

  it("keeps OSM sources missing from the run, to age out later", () => {
    const before = site(["way/1", "way/2"]);
    const plan = planSave([site(["way/1"])], state([stored(7, before)]), catalog);
    expect(plan.unchanged).toHaveLength(1);
    expect(plan.unchanged[0]?.sources.map((s) => s.externalId)).toEqual(["way/1"]);
  });

  it("never plans to reactivate a hidden site", () => {
    const before = site(["node/1"]);
    const plan = planSave(
      [site(["node/1"], { altitudeM: 900 })],
      state([stored(7, before, { status: "hidden" })]),
      catalog,
    );
    expect(plan.updates[0]).toMatchObject({ id: 7, contentChanged: true, hide: false });
  });

  it("merges stored sites now found as one into the oldest", () => {
    const a = stored(5, site(["node/1"]));
    const b = stored(9, site(["node/2"]));
    const [update] = planSave([site(["node/2", "node/1"])], state([b, a]), catalog).updates;
    expect(update).toMatchObject({ id: 5, absorbedIds: [9], hide: false });
    expect(update?.newSources.map((s) => s.externalId)).toEqual(["node/2"]);

    const hidden = stored(9, site(["node/2"]), { status: "hidden" });
    const merged = planSave([site(["node/1", "node/2"])], state([a, hidden]), catalog).updates;
    expect(merged[0]).toMatchObject({ id: 5, absorbedIds: [9], hide: true });
  });

  it("splits a stored site: the run site holding more of it keeps it, the other is new", () => {
    const river = stored(5, site(["way/1", "way/2", "way/3"], { placeTypeSlug: "rio" }));
    const cali = site(["way/3"], { name: "Río Cauca", placeTypeSlug: "rio", municipalityId: 4 });
    const dagua = site(["way/1", "way/2"], { name: "Río Cauca", placeTypeSlug: "rio" });
    const plan = planSave([cali, dagua], state([river]), catalog);
    expect(plan.updates.map((u) => u.id)).toEqual([5]);
    expect(plan.updates[0]?.data.fields.municipalityId).toBe(3);
    expect(plan.creates.map((c) => c.slug)).toEqual(["rio-cauca-cali"]);
    // The new site takes way/3 from site 5 when its sources are added.
    expect(plan.creates[0]?.data.sources.map((s) => s.externalId)).toEqual(["way/3"]);
  });
});

describe("matchStoredPlaces", () => {
  it("matches nothing when no element is stored", () => {
    const { placeOf, absorbedBy } = matchStoredPlaces([site(["node/1"])], state([]));
    expect(placeOf.size).toBe(0);
    expect(absorbedBy.size).toBe(0);
  });
});
