import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/components/og-card";
import { getMunicipality } from "@/modules/catalogs/service";
import { getMunicipalityPlaceTypes } from "@/modules/places/service";

export const alt = "Sitios turísticos de un municipio del Valle del Cauca";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A municipality's image in shared links (HU-71), drawn with its most common place type. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const [municipality, types] = await Promise.all([
    getMunicipality(slug),
    getMunicipalityPlaceTypes(slug),
  ]);
  if (!municipality) notFound();
  const total = types.reduce((sum, type) => sum + type.total, 0);
  const sites = total === 1 ? "1 sitio turístico" : `${total} sitios turísticos`;
  return ogCard({
    title: municipality.name,
    subtitle: `${sites} · ${municipality.department}`,
    typeSlug: types[0]?.slug ?? "cerro",
  });
}
