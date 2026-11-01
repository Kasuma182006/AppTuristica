import { COST_LABELS, DIFFICULTY_LABELS, type PlaceDetail } from "@/modules/places/types";

export interface PlaceFact {
  label: string;
  value: string;
}

const numberFormat = new Intl.NumberFormat("es-CO");

/** Difficulty, altitude and entrance cost of a site, each only when there is data (RF-10). */
export function placeFacts(
  place: Pick<PlaceDetail, "difficulty" | "altitudeM" | "cost">,
): PlaceFact[] {
  const facts: PlaceFact[] = [];
  if (place.difficulty) {
    facts.push({ label: "Dificultad", value: DIFFICULTY_LABELS[place.difficulty] });
  }
  if (place.altitudeM !== null) {
    facts.push({ label: "Altitud", value: `${numberFormat.format(place.altitudeM)} m s. n. m.` });
  }
  if (place.cost) facts.push({ label: "Costo de entrada", value: COST_LABELS[place.cost] });
  return facts;
}
