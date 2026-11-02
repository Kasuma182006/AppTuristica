import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/components/og-card";

export const alt = "Buscador turístico del Valle del Cauca";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** The image of the home page and of pages without their own (HU-71). */
export default function Image() {
  return ogCard({
    title: "Sitios turísticos poco conocidos",
    subtitle: "Cascadas, senderos, miradores y ríos del Valle del Cauca",
    typeSlug: "cascada",
  });
}
