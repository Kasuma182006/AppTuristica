import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Only the API is blocked (HU-72). Pages with noindex must stay crawlable: if robots.txt blocked
 * them, search engines could not read the noindex and might list their addresses anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
