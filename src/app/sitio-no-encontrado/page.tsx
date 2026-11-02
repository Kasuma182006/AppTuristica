import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Sitio no encontrado" };

/**
 * Where proxy.ts rewrites unknown or hidden sites (HU-69). It reaches notFound() while
 * prerendering, so it stays static and is served with a real HTTP 404, which the streamed site
 * page cannot do.
 */
export default function SiteNotFound() {
  notFound();
}
