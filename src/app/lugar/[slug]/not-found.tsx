import type { Metadata } from "next";
import { PlaceNotFound } from "@/components/place-not-found";

export const metadata: Metadata = { title: "Sitio no encontrado" };

/**
 * notFound() from the site page. Usually proxy.ts has already sent the visitor to
 * /sitio-no-encontrado (real 404); this covers the rest, e.g. a site hidden in between.
 */
export default function PlaceNotFoundPage() {
  return <PlaceNotFound />;
}
