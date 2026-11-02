import type { PlaceDetail } from "@/modules/places/types";

export interface Directions {
  /** A route in Google Maps (the app on phones), from wherever the visitor is. */
  googleMaps: string;
  /** The same destination in OpenStreetMap. */
  openStreetMap: string;
  /** Only the municipality: the site is fragile. */
  municipalityOnly: boolean;
}

/**
 * "Cómo llegar" (HU-62, RF-12): the site's coordinates, or for a fragile site only its
 * municipality, named with its department and country: Sevilla, Trujillo or El Cairo would
 * otherwise lead to Spain, Peru or Egypt. Fragile sites never use their location, not even the
 * approximate one.
 */
export function directionsFor(
  place: Pick<PlaceDetail, "location" | "municipality" | "department">,
): Directions {
  if (place.location.approximate) {
    const query = encodeURIComponent(`${place.municipality.name}, ${place.department}, Colombia`);
    return {
      googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
      openStreetMap: `https://www.openstreetmap.org/search?query=${query}`,
      municipalityOnly: true,
    };
  }

  const { lat, lng } = place.location;
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}`,
    openStreetMap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    municipalityOnly: false,
  };
}
