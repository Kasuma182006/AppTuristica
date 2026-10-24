import { describe, expect, it } from "vitest";
import type { CandidatePlace } from "../../pipeline/types";
import { groupRiverSegments, isCanalName } from "./rivers";

const ACTIVITY_ORDER = ["senderismo", "bano-en-rio", "fotografia"];

function candidate(externalId: string, overrides: Partial<CandidatePlace> = {}): CandidatePlace {
  return {
    name: "Río Pance",
    placeTypeSlug: "rio",
    difficulty: null,
    altitudeM: null,
    cost: null,
    activitySlugs: [],
    elements: [{ externalId, point: { lat: 3.3, lon: -76.6 }, tags: { waterway: "river" } }],
    ...overrides,
  };
}

const ids = (c: CandidatePlace | undefined) => c?.elements.map((e) => e.externalId);

describe("isCanalName", () => {
  it("detects names starting with the word Canal", () => {
    expect(isCanalName("Canal CVC Sur")).toBe(true);
    expect(isCanalName("canal interceptor")).toBe(true);
    expect(isCanalName("Canal")).toBe(true);
    expect(isCanalName("Río Canalete")).toBe(false);
    expect(isCanalName("Canaleta")).toBe(false);
  });
});

describe("groupRiverSegments", () => {
  it("joins segments with the same name, ignoring case and accents, keeping every point", () => {
    const { candidates, discarded } = groupRiverSegments(
      [
        candidate("way/1"),
        candidate("way/2", { name: "Rio Pance" }),
        candidate("way/3"),
        candidate("way/4", { name: "Río Cali" }),
      ],
      ACTIVITY_ORDER,
    );
    expect(discarded).toEqual([]);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ name: "Río Pance", placeTypeSlug: "rio" });
    expect(ids(candidates[0])).toEqual(["way/1", "way/2", "way/3"]);
    expect(ids(candidates[1])).toEqual(["way/4"]);
  });

  it("merges optional data and activities in display order", () => {
    const [river] = groupRiverSegments(
      [
        candidate("way/1", { activitySlugs: ["fotografia"] }),
        candidate("way/2", { altitudeM: 1200, activitySlugs: ["bano-en-rio", "fotografia"] }),
        candidate("way/3", { altitudeM: 900, cost: "free" }),
      ],
      ACTIVITY_ORDER,
    ).candidates;
    expect(river).toMatchObject({
      altitudeM: 1200,
      cost: "free",
      difficulty: null,
      activitySlugs: ["bano-en-rio", "fotografia"],
    });
  });

  it("drops every river relation, keeping rivers from their ways", () => {
    const { candidates, discarded } = groupRiverSegments(
      [
        candidate("relation/9"),
        candidate("way/1"),
        candidate("way/2"),
        // Named differently from its ways ("Río La Vieja"), and without ways at all.
        candidate("relation/10", { name: "La Vieja River" }),
        candidate("relation/11", { name: null }),
      ],
      ACTIVITY_ORDER,
    );
    expect(candidates).toHaveLength(1);
    expect(ids(candidates[0])).toEqual(["way/1", "way/2"]);
    expect(discarded).toEqual([
      { externalIds: ["relation/9"], name: "Río Pance", reason: "river-relation" },
      { externalIds: ["relation/10"], name: "La Vieja River", reason: "river-relation" },
      { externalIds: ["relation/11"], name: null, reason: "river-relation" },
    ]);
  });

  it("discards canals tagged as rivers", () => {
    const { candidates, discarded } = groupRiverSegments(
      [
        candidate("way/1", { name: "Canal CVC Sur" }),
        candidate("way/2", { name: "Canal CVC Sur" }),
      ],
      ACTIVITY_ORDER,
    );
    expect(candidates).toEqual([]);
    expect(discarded).toEqual([
      { externalIds: ["way/1"], name: "Canal CVC Sur", reason: "canal" },
      { externalIds: ["way/2"], name: "Canal CVC Sur", reason: "canal" },
    ]);
  });

  it("leaves unnamed segments and other types untouched", () => {
    const unnamed = candidate("way/1", { name: null });
    const lake = candidate("way/2", { placeTypeSlug: "lago", name: "Canal Lake" });
    const { candidates, discarded } = groupRiverSegments([unnamed, lake], ACTIVITY_ORDER);
    expect(candidates).toEqual([unnamed, lake]);
    expect(discarded).toEqual([]);
  });

  it("uses the most common spelling as the name", () => {
    const [river] = groupRiverSegments(
      [candidate("way/1", { name: "Rio Pance" }), candidate("way/2"), candidate("way/3")],
      ACTIVITY_ORDER,
    ).candidates;
    expect(river?.name).toBe("Río Pance");
  });
});
