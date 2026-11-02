import type { PlaceDetail } from "@/modules/places/types";

const SOURCE_LABELS: Record<PlaceDetail["sources"][number]["source"], string> = {
  openstreetmap: "OpenStreetMap",
  wikidata: "Wikidata",
  comunidad: "Comunidad",
};

export interface SourceGroup {
  label: string;
  /** Elements of this source, e.g. the 35 OSM segments of a river. */
  count: number;
  /** Empty for fragile sites and the community: nothing to link to. */
  urls: string[];
}

/** The site's sources, one group per kind, in the order the API gives them (HU-65). */
export function groupSources(sources: PlaceDetail["sources"]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const { source, url } of sources) {
    const group = groups.get(source) ?? { label: SOURCE_LABELS[source], count: 0, urls: [] };
    group.count += 1;
    if (url) group.urls.push(url);
    groups.set(source, group);
  }
  return [...groups.values()];
}

/**
 * What would raise the site's confidence score (docs/confianza.md), in the formula's order.
 * Wikipedia is left out for fragile sites: their article link is hidden, so it may be there.
 */
export function confidenceMissing(
  place: Pick<
    PlaceDetail,
    "sources" | "photos" | "difficulty" | "cost" | "altitudeM" | "wikipediaUrl" | "fragile"
  >,
): string[] {
  const missing: string[] = [];
  if (new Set(place.sources.map(({ source }) => source)).size < 2) missing.push("otra fuente");
  if (place.photos.length === 0) missing.push("fotos");
  if (place.difficulty === null) missing.push("dificultad");
  if (place.cost === null) missing.push("costo de entrada");
  if (place.altitudeM === null) missing.push("altitud");
  if (place.wikipediaUrl === null && !place.fragile) missing.push("artículo de Wikipedia");
  return missing;
}

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

/** "25 de octubre de 2026", the day in Colombia. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
