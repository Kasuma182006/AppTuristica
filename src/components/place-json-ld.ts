import { placePath } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import type { PlaceDetail, PlacePhoto } from "@/modules/places/types";

function imageObject({ url, author, license, licenseUrl }: PlacePhoto) {
  return {
    "@type": "ImageObject",
    contentUrl: url,
    creditText: `${author} (${license})`,
    ...(licenseUrl ? { license: licenseUrl } : {}),
  };
}

/**
 * schema.org data of a site page (HU-73). A fragile site has no `geo`, since the approximation
 * would read as its real position, and no `image`, since the file can reveal the place. Its
 * address stops at the municipality, like every site's: none has a street address.
 */
export function placeJsonLd(place: PlaceDetail) {
  const { location, fragile } = place;
  const photos = fragile ? [] : place.photos;
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name,
    ...(place.description ? { description: place.description } : {}),
    url: `${SITE_URL}${placePath(place.slug)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: place.municipality.name,
      addressRegion: place.department,
      addressCountry: "CO",
    },
    ...(location.approximate
      ? {}
      : {
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.lat,
            longitude: location.lng,
            ...(place.altitudeM === null ? {} : { elevation: place.altitudeM }),
          },
        }),
    ...(photos.length > 0 ? { image: photos.map(imageObject) } : {}),
    // Already null for fragile sites: the article may give the coordinates.
    ...(place.wikipediaUrl ? { sameAs: place.wikipediaUrl } : {}),
    ...(place.cost ? { isAccessibleForFree: place.cost === "gratis" } : {}),
  };
}

/**
 * The text of a JSON-LD script. Escaping "<" keeps a name or description written by the community
 * from closing the script tag and running as HTML.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
