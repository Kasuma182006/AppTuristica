import type { Metadata } from "next";

/** The site's name in shared links (og:site_name). */
export const SITE_NAME = "Buscador turístico";

/**
 * Title, description, canonical address and Open Graph of a page (HU-71). Next.js replaces the
 * layout's openGraph as a whole, so each page sends all of it; the image comes from the
 * route's opengraph-image. Twitter's tags are left to the layout: Next.js fills them from these.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** The canonical address, relative to metadataBase, e.g. /sitio/embalse-de-calima. */
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "es_CO",
      type: "website",
    },
  };
}
