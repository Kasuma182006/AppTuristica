import { confidenceScore, type PlaceSource } from "@/modules/places/confidence";
import type { DescribedSite, ScoredSite } from "./types";

/** Sources of an ingested site: OSM, plus Wikidata when its item exists (HU-27). */
function sourcesOf(site: DescribedSite): PlaceSource[] {
  return site.wikidata ? ["openstreetmap", "wikidata"] : ["openstreetmap"];
}

/** Adds the confidence score (HU-30) to every site. */
export function scoreSites(sites: readonly DescribedSite[]): ScoredSite[] {
  return sites.map((site) => ({
    ...site,
    confidence: confidenceScore({
      sources: sourcesOf(site),
      difficulty: site.difficulty,
      altitudeM: site.altitudeM,
      cost: site.cost,
      photoCount: site.photos.length,
      wikipediaUrl: site.wikidata?.wikipediaUrl ?? null,
    }),
  }));
}

/** e.g. "confidence: 30 → 444 sites, 35 → 73, 55 → 21" (lowest score first). */
export function summarizeConfidence(sites: readonly ScoredSite[]): string {
  const counts = new Map<number, number>();
  for (const site of sites) counts.set(site.confidence, (counts.get(site.confidence) ?? 0) + 1);
  const parts = [...counts]
    .sort(([a], [b]) => a - b)
    .map(([score, count], i) => `${score} → ${count}${i === 0 ? " sites" : ""}`);
  return `confidence: ${parts.join(", ")}`;
}
