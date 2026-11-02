import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/components/og-card";
import { getPlace } from "@/modules/places/service";

export const alt = "Sitio turístico del Valle del Cauca";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A site's image in shared links (HU-71): only its name, type and municipality. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const place = await getPlace(slug);
  if (!place) notFound();
  return ogCard({
    title: place.name,
    subtitle: `${place.placeType.name} · ${place.municipality.name}, ${place.department}`,
    typeSlug: place.placeType.slug,
  });
}
