import { slugify } from "@/lib/slug";
import type { OsmTags } from "@/modules/catalogs/osm-tags";
import type { CatalogMunicipality } from "../catalog";
import { representativeElement } from "./restrictions";
import type { DescribedSite, Difficulty, SiteWithPhotos } from "./types";

// Site descriptions (HU-29): our own short texts built only from the site's data, never copied
// from a source. Impersonal and without the site's name (the page title already shows it), so no
// article or gender has to be guessed. Activities are left out: the page lists them apart.

/**
 * What the site is, as the first words of its description; refined with OSM tags (or the name)
 * when they tell.
 */
type KindOf = (tags: OsmTags, name: string) => string;

const KINDS: Readonly<Record<string, KindOf>> = {
  cascada: () => "Cascada",
  // Streams are tagged as rivers too; their name tells them apart ("Quebrada Ordoñez").
  rio: (_tags, name) =>
    /^quebrada(-|$)/.test(slugify(name)) ? "Tramo de la quebrada" : "Tramo del río",
  mirador: () => "Mirador",
  cerro: (tags) =>
    tags.natural === "volcano" ? "Volcán" : tags.natural === "peak" ? "Pico" : "Cerro",
  sendero: () => "Sendero",
  lago: (tags) =>
    tags.water === "lagoon"
      ? "Laguna"
      : tags.water === "reservoir" || tags.landuse === "reservoir"
        ? "Embalse"
        : "Lago",
  "reserva-natural": (tags) =>
    tags.boundary === "national_park" ? "Parque nacional natural" : "Reserva natural",
  balneario: () => "Balneario",
  playa: () => "Playa",
};
/** For place types added to the catalog without a template yet. */
const GENERIC_KIND = "Sitio natural";

const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: "fácil",
  moderate: "moderada",
  hard: "difícil",
};

const metersFormat = new Intl.NumberFormat("es-CO");

/** The description of a site in its municipality, e.g. "Cascada en Dagua, Valle del Cauca. …". */
export function describeSite(site: SiteWithPhotos, municipality: CatalogMunicipality): string {
  const { tags } = representativeElement(site);
  const kind = (KINDS[site.placeTypeSlug] ?? (() => GENERIC_KIND))(tags, site.name);
  const difficulty =
    site.difficulty === null ? "" : `, de dificultad ${DIFFICULTY_LABELS[site.difficulty]}`;
  const sentences = [
    `${kind} en ${municipality.name}, ${municipality.departmentName}${difficulty}.`,
  ];

  if (site.altitudeM !== null) {
    sentences.push(
      `Se encuentra a ${metersFormat.format(site.altitudeM)} m sobre el nivel del mar.`,
    );
  }
  if (site.inProtectedArea) {
    const where =
      site.placeTypeSlug === "reserva-natural"
        ? "Es un área protegida"
        : "Está dentro de un área protegida";
    sentences.push(`${where}: visite el lugar con respeto y no deje rastro.`);
  }
  if (site.privateProperty)
    sentences.push("Está en propiedad privada: pida permiso antes de entrar.");
  if (site.cost === "free") sentences.push("La entrada es gratuita.");
  if (site.cost === "paid") sentences.push("La entrada tiene costo.");
  return sentences.join(" ");
}

/** Describes every site; a site whose municipality is unknown to the catalog is a bug. */
export function describeSites(
  sites: readonly SiteWithPhotos[],
  municipalities: ReadonlyMap<number, CatalogMunicipality>,
): DescribedSite[] {
  return sites.map((site) => {
    const municipality = municipalities.get(site.municipalityId);
    if (municipality === undefined) {
      throw new Error(
        `Municipality ${site.municipalityId} of "${site.name}" is not in the catalog`,
      );
    }
    return { ...site, description: describeSite(site, municipality) };
  });
}
