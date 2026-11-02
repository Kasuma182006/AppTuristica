import type { Municipality } from "@/modules/catalogs/types";
import type { PlaceDetail } from "@/modules/places/types";

/** Search engines show about this many characters of a description. */
export const META_DESCRIPTION_MAX = 160;

/** The text cut at a word boundary, with "…", when it is longer than `max`. */
export function truncate(text: string, max = META_DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.:;]+$/, "")}…`;
}

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase("es") + text.slice(1);

/**
 * A site's description for search engines and shared links (HU-71), unique per site:
 * "Embalse de Calima: embalse en Calima, Valle del Cauca. Actividades: pesca, deportes acuáticos."
 * Template descriptions start with a common noun, so it goes in lowercase after the name;
 * community texts are kept as written.
 */
export function placeMetaDescription(
  place: Pick<
    PlaceDetail,
    "name" | "description" | "origin" | "activities" | "placeType" | "municipality" | "department"
  >,
): string {
  const base =
    place.description ??
    `${place.placeType.name} en ${place.municipality.name}, ${place.department}.`;
  const text = place.origin === "comunidad" ? base : lowerFirst(base);
  const activities =
    place.activities.length > 0
      ? ` Actividades: ${place.activities.map((activity) => lowerFirst(activity.name)).join(", ")}.`
      : "";
  return truncate(`${place.name}: ${text}${activities}`);
}

/** How many published sites of each place type a municipality has, most common first. */
export interface PlaceTypeCount {
  name: string;
  total: number;
}

/** Place types named in a municipality's description. */
const TYPES_NAMED = 3;

/**
 * A municipality page's description (HU-71): "101 sitios turísticos poco conocidos en Cali,
 * Valle del Cauca: cerro o pico (50), reserva natural (16), cascada (12) y más."
 */
export function municipalityMetaDescription(
  municipality: Pick<Municipality, "name" | "department">,
  types: readonly PlaceTypeCount[],
): string {
  const where = `${municipality.name}, ${municipality.department}`;
  const total = types.reduce((sum, type) => sum + type.total, 0);
  if (total === 0) return `Aún no hay sitios publicados en ${where}. Propón uno.`;

  const sites =
    total === 1 ? "1 sitio turístico poco conocido" : `${total} sitios turísticos poco conocidos`;
  const named = types
    .slice(0, TYPES_NAMED)
    .map((type) => `${lowerFirst(type.name)} (${type.total})`)
    .join(", ");
  const more = types.length > TYPES_NAMED ? " y más" : "";
  return truncate(`${sites} en ${where}: ${named}${more}.`);
}
