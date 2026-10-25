import { describe, expect, it } from "vitest";
import type { EnrichedSite, Point } from "../pipeline/types";
import {
  attachPhotos,
  isFreeLicense,
  isKnownAuthor,
  parseFiles,
  plainText,
  selectPhotos,
  summarizePhotos,
  toPhoto,
  type CommonsFile,
  type PhotoRules,
} from "./commons";

function file(title: string, overrides: Partial<CommonsFile> = {}): CommonsFile {
  const name = title.replace(/^File:/, "").replace(/ /g, "_");
  return {
    title,
    url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${name}`,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${name}`,
    mime: "image/jpeg",
    width: 4000,
    height: 3000,
    author: "Ana Pérez",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    coordinates: null,
    ...overrides,
  };
}

const SITE_MUNICIPALITY = 7;
/** Rules for a normal, non-river site; geotagged files fall in `municipality` (null = outside). */
function rules(
  overrides: Partial<PhotoRules> = {},
  municipality: number | null = SITE_MUNICIPALITY,
) {
  return {
    fragile: false,
    takenAtSiteOnly: false,
    siteMunicipalityId: SITE_MUNICIPALITY,
    municipalityOf: () => municipality,
    ...overrides,
  };
}
const anywhere: PhotoRules = rules();

describe("plainText", () => {
  it("strips HTML and decodes common entities", () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:Ana">Ana P&eacute;rez</a>')).toBe(
      "Ana P&eacute;rez",
    );
    expect(plainText("<span>Juan &amp; Luisa</span>\n")).toBe("Juan & Luisa");
    expect(plainText("  ")).toBeNull();
    expect(plainText(undefined)).toBeNull();
  });
});

describe("isFreeLicense", () => {
  it.each(["CC BY-SA 4.0", "CC BY 2.0", "CC BY-SA 3.0 IGO", "CC0", "Public domain", "PD-self"])(
    "accepts %s",
    (license) => {
      expect(isFreeLicense(license)).toBe(true);
    },
  );

  it.each(["CC BY-NC 2.0", "CC BY-NC-SA 4.0", "CC BY-ND 3.0", "GFDL", "All rights reserved"])(
    "rejects %s",
    (license) => {
      expect(isFreeLicense(license)).toBe(false);
    },
  );
});

describe("isKnownAuthor", () => {
  it("rejects missing, unknown and anonymous authors", () => {
    expect(isKnownAuthor("Ana Pérez")).toBe(true);
    for (const author of [
      null,
      "Unknown",
      "unknown author",
      "Desconocido",
      "Anónimo",
      "Anonymous",
    ]) {
      expect(isKnownAuthor(author)).toBe(false);
    }
  });
});

describe("toPhoto", () => {
  it("keeps the attribution and upgrades the license URL to https", () => {
    expect(
      toPhoto(
        file("File:Lago Calima.jpg", { licenseUrl: "http://creativecommons.org/x" }),
        anywhere,
      ),
    ).toEqual({
      url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Lago_Calima.jpg",
      author: "Ana Pérez",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/x",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lago_Calima.jpg",
      width: 4000,
      height: 3000,
    });
  });

  it("rejects files that are not photos, not free, or without an author", () => {
    expect(toPhoto(file("File:Mapa.svg", { mime: "image/svg+xml" }), anywhere)).toBeNull();
    expect(toPhoto(file("File:A.jpg", { license: "CC BY-NC 2.0" }), anywhere)).toBeNull();
    expect(toPhoto(file("File:A.jpg", { license: null }), anywhere)).toBeNull();
    expect(toPhoto(file("File:A.jpg", { author: "Unknown" }), anywhere)).toBeNull();
    expect(toPhoto(file("File:A.jpg", { url: "https://example.com/a.jpg" }), anywhere)).toBeNull();
  });

  it("rejects geotagged photos taken outside the scope", () => {
    const geotagged = file("File:Río Cauca (La Pintada).jpg", {
      coordinates: { lat: 5.74, lon: -75.6 },
    });
    expect(toPhoto(geotagged, rules({}, null))).toBeNull();
    expect(toPhoto(geotagged, anywhere)).not.toBeNull();
    // Without coordinates the place cannot be checked: the photo is kept.
    expect(toPhoto(file("File:Lago Calima, Valle del Cauca.JPG"), rules({}, null))).not.toBeNull();
  });

  it("only gives rivers photos geotagged in their own municipality", () => {
    const river = rules({ takenAtSiteOnly: true });
    const at = { lat: 3.9, lon: -76.3 };
    expect(toPhoto(file("File:Río Cauca.jpg", { coordinates: at }), river)).not.toBeNull();
    expect(
      toPhoto(file("File:Río Cauca.jpg", { coordinates: at }), rules({ takenAtSiteOnly: true }, 9)),
    ).toBeNull();
    // Río Cauca's image has no coordinates and shows Antioquia.
    expect(toPhoto(file("File:Río Cauca (La Pintada Antioquia).jpg"), river)).toBeNull();
  });

  it("only keeps photos without coordinates for fragile sites", () => {
    const fragile: PhotoRules = rules({ fragile: true });
    expect(
      toPhoto(file("File:A.jpg", { coordinates: { lat: 3.86, lon: -76.35 } }), fragile),
    ).toBeNull();
    expect(toPhoto(file("File:B.jpg"), fragile)).not.toBeNull();
  });
});

describe("selectPhotos", () => {
  it("keeps the first five usable photos, in order and without repeats", () => {
    const files = [
      file("File:1.jpg"),
      file("File:map.png", { mime: "image/png" }),
      file("File:1.jpg"),
      ...["2", "3", "4", "5", "6"].map((n) => file(`File:${n}.jpg`)),
    ];
    expect(selectPhotos(files, anywhere).map((p) => p.url.split("/").pop())).toEqual([
      "1.jpg",
      "2.jpg",
      "3.jpg",
      "4.jpg",
      "5.jpg",
    ]);
  });
});

describe("parseFiles", () => {
  it("reads imageinfo, metadata and coordinates, keyed by requested and normalized title", () => {
    const files = parseFiles({
      query: {
        normalized: [{ from: "File:Lago_Calima.jpg", to: "File:Lago Calima.jpg" }],
        pages: [
          {
            title: "File:Lago Calima.jpg",
            imageinfo: [
              {
                url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Lago_Calima.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Lago_Calima.jpg",
                mime: "image/jpeg",
                width: 800,
                height: 600,
                extmetadata: {
                  Artist: { value: '<a href="x">Ana</a>' },
                  LicenseShortName: { value: "CC BY 4.0" },
                  LicenseUrl: { value: "https://creativecommons.org/licenses/by/4.0" },
                },
              },
            ],
            coordinates: [{ lat: 3.88, lon: -76.52 }],
          },
          { title: "File:Missing.jpg", missing: true },
        ],
      },
    });
    expect(files.get("File:Lago_Calima.jpg")).toBe(files.get("File:Lago Calima.jpg"));
    expect(files.get("File:Lago Calima.jpg")).toMatchObject({
      author: "Ana",
      license: "CC BY 4.0",
      coordinates: { lat: 3.88, lon: -76.52 },
    });
    expect(files.has("File:Missing.jpg")).toBe(false);
  });
});

describe("attachPhotos", () => {
  type Reply = Record<string, unknown>;
  function fakeCommons(category: string[], pages: Reply[]) {
    const requests: URL[] = [];
    const fetch = async (input: string | URL | Request) => {
      const url = new URL(String(input));
      requests.push(url);
      const body =
        url.searchParams.get("list") === "categorymembers"
          ? { query: { categorymembers: category.map((title) => ({ title })) } }
          : { query: { pages } };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    return { requests, options: { fetch: fetch as typeof globalThis.fetch, log: () => {} } };
  }
  const page = (title: string, coordinates?: Point) => ({
    title,
    imageinfo: [
      {
        url: `https://upload.wikimedia.org/x/${title.slice(5)}`,
        descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
        mime: "image/jpeg",
        extmetadata: { Artist: { value: "Ana" }, LicenseShortName: { value: "CC BY-SA 4.0" } },
      },
    ],
    ...(coordinates ? { coordinates: [coordinates] } : {}),
  });
  const site = (overrides: Partial<EnrichedSite>) =>
    ({
      name: "Lago Calima",
      placeTypeSlug: "lago",
      municipalityId: 7,
      sensitivity: "normal",
      wikidata: null,
      ...overrides,
    }) as EnrichedSite;
  const calima = {
    id: "Q3133513",
    description: null,
    wikipediaUrl: null,
    image: "Lago Calima.jpg",
    commonsCategory: "Lake Calima",
  };

  it("puts the item's image first, then category files, skipping those taken out of scope", async () => {
    const outside = { lat: 5.74, lon: -75.6 };
    const { options } = fakeCommons(
      ["File:Calima 1.jpg", "File:Lago Calima.jpg", "File:Calima Antioquia.jpg"],
      [
        page("File:Lago Calima.jpg"),
        page("File:Calima 1.jpg"),
        page("File:Calima Antioquia.jpg", outside),
      ],
    );
    const locate = async (points: readonly Point[]) => points.map((p) => (p.lat < 5 ? 7 : null));
    const [withPhotos, withoutItem] = await attachPhotos(
      [site({ wikidata: calima }), site({ name: "Charco Azul" })],
      locate,
      options,
    );
    expect(withPhotos?.photos.map((p) => p.url.split("/").pop())).toEqual([
      "Lago Calima.jpg",
      "Calima 1.jpg",
    ]);
    expect(withoutItem?.photos).toEqual([]);
    expect(summarizePhotos([withPhotos!, withoutItem!])).toBe(
      "1 sites with Commons photos (2 photos)",
    );
  });

  it("makes no request when no site has a Wikidata item", async () => {
    const { requests, options } = fakeCommons([], []);
    await attachPhotos([site({})], async () => [], options);
    expect(requests).toEqual([]);
  });
});
