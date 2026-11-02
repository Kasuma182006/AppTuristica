import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import type { PlaceDetail } from "@/modules/places/types";
import { placeJsonLd, serializeJsonLd } from "./place-json-ld";

const photo = {
  url: "https://upload.wikimedia.org/calima.jpg",
  width: 800,
  height: 600,
  author: "Ana",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Calima.jpg",
};

const calima: PlaceDetail = {
  slug: "embalse-de-calima",
  name: "Embalse de Calima",
  municipality: { slug: "calima", name: "Calima" },
  placeType: { slug: "lago", name: "Lago o laguna" },
  activities: [],
  difficulty: null,
  origin: "abiertas",
  confidence: 80,
  location: { lat: 3.89249, lng: -76.50198, approximate: false, radiusM: null },
  department: "Valle del Cauca",
  description: "Embalse en Calima, Valle del Cauca.",
  wikidataDescription: "embalse de Colombia",
  wikipediaUrl: "https://es.wikipedia.org/wiki/Lago_Calima",
  altitudeM: 1400,
  cost: null,
  fragile: false,
  inProtectedArea: false,
  privateProperty: false,
  photos: [photo],
  sources: [],
  updatedAt: "2026-10-25T02:44:24.371Z",
};

/** The same site when fragile, as `toPlaceDetail` gives it. */
const fragile: PlaceDetail = {
  ...calima,
  fragile: true,
  wikipediaUrl: null,
  location: { lat: 3.89, lng: -76.51, approximate: true, radiusM: 2000 },
  photos: [{ ...photo, sourceUrl: null }],
};

describe("placeJsonLd", () => {
  it("describes a site as a TouristAttraction, with its address and page", () => {
    expect(placeJsonLd(calima)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: "Embalse de Calima",
      description: "Embalse en Calima, Valle del Cauca.",
      url: `${SITE_URL}/sitio/embalse-de-calima`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Calima",
        addressRegion: "Valle del Cauca",
        addressCountry: "CO",
      },
      sameAs: "https://es.wikipedia.org/wiki/Lago_Calima",
    });
  });

  it("gives the exact point of a normal site, with its altitude", () => {
    expect(placeJsonLd(calima).geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 3.89249,
      longitude: -76.50198,
      elevation: 1400,
    });
    expect(placeJsonLd({ ...calima, altitudeM: null }).geo).not.toHaveProperty("elevation");
  });

  it("credits each photo with its author and license", () => {
    expect(placeJsonLd(calima).image).toEqual([
      {
        "@type": "ImageObject",
        contentUrl: photo.url,
        creditText: "Ana (CC BY-SA 4.0)",
        license: photo.licenseUrl,
      },
    ]);
    const [withoutLink] =
      placeJsonLd({ ...calima, photos: [{ ...photo, licenseUrl: null }] }).image ?? [];
    expect(withoutLink).not.toHaveProperty("license");
  });

  it("gives no point, photo or external link of a fragile site", () => {
    const data = placeJsonLd(fragile);
    expect(data).not.toHaveProperty("geo");
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("sameAs");
    expect(data).toMatchObject({
      name: "Embalse de Calima",
      address: { addressLocality: "Calima" },
    });
    const text = JSON.stringify(data);
    expect(text).not.toContain("3.89");
    expect(text).not.toContain("wikimedia");
    expect(text).not.toContain("wikipedia");
  });

  it("gives no photo of a fragile site even if its location were exact", () => {
    const data = placeJsonLd({ ...fragile, location: calima.location });
    expect(data).not.toHaveProperty("image");
  });

  it("leaves out what is not known", () => {
    const data = placeJsonLd({
      ...calima,
      description: null,
      wikipediaUrl: null,
      photos: [],
    });
    for (const key of ["description", "sameAs", "image", "isAccessibleForFree"]) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it("says whether the entrance is free only when the cost is known", () => {
    expect(placeJsonLd({ ...calima, cost: "gratis" }).isAccessibleForFree).toBe(true);
    expect(placeJsonLd({ ...calima, cost: "pago" }).isAccessibleForFree).toBe(false);
  });

  it("never uses Wikidata's text as the description", () => {
    expect(JSON.stringify(placeJsonLd(calima))).not.toContain("embalse de Colombia");
  });
});

describe("serializeJsonLd", () => {
  it("keeps a community text from closing the script", () => {
    const text = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
