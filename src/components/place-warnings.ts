import type { PlaceDetail } from "@/modules/places/types";

export interface PlaceWarning {
  label: string;
  /** What it means for the visit, shown after "label:"; always visible, phones have no tooltips. */
  explanation: string;
  /** Restrictions stand out; the community label is information. */
  tone: "warning" | "info";
}

/**
 * The site's warning labels (HU-63, RF-13), in a fixed order. A fragile site is usually also in
 * a protected area; both labels show, since they mean different things.
 */
export function placeWarnings(
  place: Pick<PlaceDetail, "inProtectedArea" | "privateProperty" | "fragile" | "origin">,
): PlaceWarning[] {
  const warnings: PlaceWarning[] = [];
  if (place.inProtectedArea) {
    warnings.push({
      label: "Área protegida",
      explanation: "puede requerir permiso o tener reglas de visita; consúltalas antes de ir.",
      tone: "warning",
    });
  }
  if (place.privateProperty) {
    warnings.push({
      label: "Propiedad privada",
      explanation: "pide permiso al propietario antes de entrar.",
      tone: "warning",
    });
  }
  if (place.fragile) {
    warnings.push({
      label: "Sitio frágil",
      explanation: "mostramos su ubicación aproximada para protegerlo.",
      tone: "warning",
    });
  }
  if (place.origin === "comunidad") {
    warnings.push({
      label: "Propuesto por la comunidad · No verificado",
      explanation: "lo agregó un visitante y nadie ha comprobado sus datos todavía.",
      tone: "info",
    });
  }
  return warnings;
}
