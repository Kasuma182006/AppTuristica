import { placePath } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import type { PlaceDetail } from "@/modules/places/types";

export interface ShareData {
  /** The production address, also when browsing a preview deployment. */
  url: string;
  title: string;
  /** What the message says before the link. */
  text: string;
  /** Opens WhatsApp (the app on phones) with the message ready to send. */
  whatsapp: string;
}

/** How a site page is shared (HU-68, RF-18): "Embalse de Calima, Calima" and its link. */
export function shareDataFor(
  place: Pick<PlaceDetail, "slug" | "name" | "municipality">,
): ShareData {
  const url = `${SITE_URL}${placePath(place.slug)}`;
  const text = `${place.name}, ${place.municipality.name}`;
  return {
    url,
    title: place.name,
    text,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`,
  };
}
