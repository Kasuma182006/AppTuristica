import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { sitemapEntries } from "@/lib/sitemap";
import { getSitemapData } from "@/modules/places/service";

/**
 * Read from the database on each request (HU-72), so it follows every ingest, and a proposed or
 * hidden site shows or leaves at once. Not built ahead: CI builds without a database.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return sitemapEntries(await getSitemapData());
}
