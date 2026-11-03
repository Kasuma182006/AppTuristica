import { describe, expect, it } from "vitest";
import { sitemapEntries } from "./sitemap";
import { SITE_URL } from "./site";

describe("sitemapEntries", () => {
  const updatedAt = new Date("2026-10-25T02:44:24Z");
  const entries = sitemapEntries({
    places: [{ slug: "embalse-de-calima", updatedAt }],
    municipalitySlugs: ["cali"],
  });
  const urls = entries.map((entry) => entry.url);

  it("lists the fixed pages, municipalities and sites with absolute addresses", () => {
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/api-docs`,
      `${SITE_URL}/proponer`,
      `${SITE_URL}/terminos`,
      `${SITE_URL}/aviso`,
      `${SITE_URL}/fuentes`,
      `${SITE_URL}/contacto`,
      `${SITE_URL}/lugar/cali`,
      `${SITE_URL}/sitio/embalse-de-calima`,
    ]);
  });

  it("gives a last change to sites only", () => {
    const dated = entries.filter((entry) => entry.lastModified);
    expect(dated).toEqual([
      { url: `${SITE_URL}/sitio/embalse-de-calima`, lastModified: updatedAt },
    ]);
  });

  it("leaves noindex and error pages out", () => {
    for (const path of ["/explorar", "/estilos", "/sitio-no-encontrado", "/api/"]) {
      expect(urls.some((url) => url.startsWith(`${SITE_URL}${path}`))).toBe(false);
    }
  });

  it("still lists the fixed pages with no data", () => {
    expect(sitemapEntries({ places: [], municipalitySlugs: [] })).toHaveLength(7);
  });
});
