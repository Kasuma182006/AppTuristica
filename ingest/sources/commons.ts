import { z } from "zod";
import type { EnrichedSite, PhotoCandidate, Point, SiteWithPhotos } from "../pipeline/types";
import { RIVER_TYPE_SLUG } from "./osm/rivers";
import { getWikimediaJson, type WikimediaOptions } from "./wikimedia";

// Enrichment step of the `osm` run (HU-28): photos from Wikimedia Commons for sites with a
// Wikidata item: its image (P18) first, then files of its Commons category (P373). Commons barely
// covers little-known places by location (a geosearch sample found 1 useful file in 20 sites).

const API_URL = "https://commons.wikimedia.org/w/api.php";
export const MAX_PHOTOS_PER_SITE = 5;
// The API accepts at most 50 titles per request.
const MAX_TITLES_PER_REQUEST = 50;
// Files listed per category; enough to find five usable photos in Sonso's 68.
const MAX_CATEGORY_FILES = 200;

/** A Commons file with the metadata needed to judge and credit it. */
export interface CommonsFile {
  title: string;
  url: string;
  sourceUrl: string;
  mime: string;
  width: number | null;
  height: number | null;
  /** Plain text, from the HTML `Artist` field. */
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  /** Where the photo was taken, when the file is geotagged. */
  coordinates: Point | null;
}

const metadataValue = z.object({ value: z.unknown() }).optional();
const pageSchema = z.object({
  title: z.string(),
  missing: z.boolean().optional(),
  imageinfo: z
    .array(
      z.object({
        url: z.string(),
        descriptionurl: z.string(),
        mime: z.string(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        extmetadata: z
          .object({
            Artist: metadataValue,
            LicenseShortName: metadataValue,
            LicenseUrl: metadataValue,
          })
          .optional(),
      }),
    )
    .optional(),
  coordinates: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
});
const filesResponseSchema = z.object({
  query: z
    .object({
      normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      pages: z.array(pageSchema).optional(),
    })
    .optional(),
});
const categoryResponseSchema = z.object({
  query: z.object({ categorymembers: z.array(z.object({ title: z.string() })) }).optional(),
});

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

/** Plain text from Commons' HTML metadata, e.g. `<a href="…">Ana Pérez</a>` → "Ana Pérez". */
export function plainText(html: unknown): string | null {
  if (typeof html !== "string") return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  return text === "" ? null : text;
}

/** Parses an imageinfo response into files, keyed by the title as requested. */
export function parseFiles(body: unknown): Map<string, CommonsFile> {
  const query = filesResponseSchema.parse(body).query;
  const requestedTitle = new Map((query?.normalized ?? []).map((n) => [n.to, n.from]));
  const files = new Map<string, CommonsFile>();
  for (const page of query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    if (page.missing || info === undefined) continue;
    const metadata = info.extmetadata;
    const coordinates = page.coordinates?.[0];
    const file: CommonsFile = {
      title: page.title,
      url: info.url,
      sourceUrl: info.descriptionurl,
      mime: info.mime,
      width: info.width ?? null,
      height: info.height ?? null,
      author: plainText(metadata?.Artist?.value),
      license: plainText(metadata?.LicenseShortName?.value),
      licenseUrl: plainText(metadata?.LicenseUrl?.value),
      coordinates: coordinates ? { lat: coordinates.lat, lon: coordinates.lon } : null,
    };
    files.set(page.title, file);
    const requested = requestedTitle.get(page.title);
    if (requested !== undefined) files.set(requested, file);
  }
  return files;
}

/** Free licenses: CC0, public domain, CC BY and CC BY-SA (any version, never NC or ND). */
export function isFreeLicense(license: string | null): boolean {
  if (license === null) return false;
  const name = license.toLowerCase();
  if (/\b(nc|nd)\b/.test(name)) return false;
  return /^(cc0|public domain|pd\b|cc[ -]by(-sa)?\b)/.test(name);
}

/** An author we can credit: not empty, not "unknown" or "anonymous". */
export function isKnownAuthor(author: string | null): author is string {
  return (
    author !== null &&
    !/^(unknown|desconocido|anonymous|an[oó]nimo)( author| autor)?$/i.test(author.trim())
  );
}

export interface PhotoRules {
  /** Fragile sites only get photos without coordinates: the file page would reveal the place. */
  fragile: boolean;
  /**
   * Rivers cross several departments, so a photo without coordinates may show another stretch
   * (Río Cauca's image is from Antioquia): they only get photos taken in their own municipality.
   */
  takenAtSiteOnly: boolean;
  siteMunicipalityId: number;
  /** Municipality where a geotagged file was taken; null when outside the departments in scope. */
  municipalityOf: (file: CommonsFile) => number | null;
}

/** Whether the file's location (or lack of one) fits the site's rules. */
function placeFits(file: CommonsFile, rules: PhotoRules): boolean {
  if (file.coordinates === null) return !rules.takenAtSiteOnly;
  if (rules.fragile) return false;
  const municipalityId = rules.municipalityOf(file);
  if (municipalityId === null) return false;
  return !rules.takenAtSiteOnly || municipalityId === rules.siteMunicipalityId;
}

/** Turns a file into a photo when it passes every rule (HU-28), else null. */
export function toPhoto(file: CommonsFile, rules: PhotoRules): PhotoCandidate | null {
  if (file.mime !== "image/jpeg") return null;
  const { license, author } = file;
  if (license === null || !isFreeLicense(license) || !isKnownAuthor(author)) return null;
  if (!file.url.startsWith("https://upload.wikimedia.org/")) return null;
  if (!file.sourceUrl.startsWith("https://commons.wikimedia.org/")) return null;
  if (!placeFits(file, rules)) return null;
  const licenseUrl = file.licenseUrl?.replace(/^http:\/\//, "https://") ?? null;
  return {
    url: file.url,
    author,
    license,
    licenseUrl: licenseUrl?.startsWith("https://") ? licenseUrl : null,
    sourceUrl: file.sourceUrl,
    width: file.width,
    height: file.height,
  };
}

/** The first usable photos among the files, in order, without repeating an image. */
export function selectPhotos(files: readonly CommonsFile[], rules: PhotoRules): PhotoCandidate[] {
  const photos: PhotoCandidate[] = [];
  for (const file of files) {
    const photo = toPhoto(file, rules);
    if (photo && !photos.some((p) => p.url === photo.url)) photos.push(photo);
    if (photos.length === MAX_PHOTOS_PER_SITE) break;
  }
  return photos;
}

function apiUrl(params: Record<string, string>): string {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
  return url.toString();
}

/** File titles in a Commons category, in the category's (alphabetical) order. */
export async function listCategoryFiles(
  category: string,
  options: WikimediaOptions = {},
): Promise<string[]> {
  const url = apiUrl({
    action: "query",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmtype: "file",
    cmlimit: String(MAX_CATEGORY_FILES),
  });
  const body = await getWikimediaJson(url, (b) => categoryResponseSchema.parse(b), options);
  return (body.query?.categorymembers ?? []).map((m) => m.title);
}

/** Metadata of each file title ("File:…"), in batches of 50. */
export async function fetchFiles(
  titles: readonly string[],
  options: WikimediaOptions = {},
): Promise<Map<string, CommonsFile>> {
  const unique = [...new Set(titles)];
  const files = new Map<string, CommonsFile>();
  for (let start = 0; start < unique.length; start += MAX_TITLES_PER_REQUEST) {
    const url = apiUrl({
      action: "query",
      titles: unique.slice(start, start + MAX_TITLES_PER_REQUEST).join("|"),
      prop: "imageinfo|coordinates",
      iiprop: "url|size|mime|extmetadata",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    });
    for (const [title, file] of await getWikimediaJson(url, parseFiles, options)) {
      files.set(title, file);
    }
  }
  return files;
}

/**
 * Finds photos for every site with a Wikidata item: its image, then its category's files, keeping
 * the first five that pass the rules. `locate` gives the municipality of each point, or null when
 * it is outside the departments in scope (a PostGIS lookup).
 */
export async function attachPhotos(
  sites: readonly EnrichedSite[],
  locate: (points: readonly Point[]) => Promise<(number | null)[]>,
  options: WikimediaOptions = {},
): Promise<SiteWithPhotos[]> {
  const items = sites.flatMap((s) => (s.wikidata ? [s.wikidata] : []));
  const categories = [
    ...new Set(items.flatMap((i) => (i.commonsCategory ? [i.commonsCategory] : []))),
  ];
  const categoryFiles = new Map<string, string[]>();
  for (const category of categories) {
    categoryFiles.set(category, await listCategoryFiles(category, options));
  }

  const titlesOf = (site: EnrichedSite) => [
    ...(site.wikidata?.image ? [`File:${site.wikidata.image}`] : []),
    ...(categoryFiles.get(site.wikidata?.commonsCategory ?? "") ?? []),
  ];
  const files = await fetchFiles(sites.flatMap(titlesOf), options);

  const geotagged = [...new Set(files.values())].flatMap((f) =>
    f.coordinates === null ? [] : [{ url: f.url, point: f.coordinates }],
  );
  const municipalities = await locate(geotagged.map((g) => g.point));
  const municipalityByUrl = new Map(geotagged.map((g, i) => [g.url, municipalities[i] ?? null]));

  return sites.map((site) => {
    const siteFiles = titlesOf(site).flatMap((title) => files.get(title) ?? []);
    const photos = selectPhotos(siteFiles, {
      fragile: site.sensitivity === "fragile",
      takenAtSiteOnly: site.placeTypeSlug === RIVER_TYPE_SLUG,
      siteMunicipalityId: site.municipalityId,
      municipalityOf: (file) => municipalityByUrl.get(file.url) ?? null,
    });
    return { ...site, photos };
  });
}

export function summarizePhotos(sites: readonly SiteWithPhotos[]): string {
  const withPhotos = sites.filter((s) => s.photos.length > 0);
  const total = withPhotos.reduce((sum, s) => sum + s.photos.length, 0);
  return `${withPhotos.length} sites with Commons photos (${total} photos)`;
}
