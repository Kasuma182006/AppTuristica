export interface ConfidenceLevel {
  label: string;
  /** Filled dots out of three. */
  dots: 1 | 2 | 3;
}

/**
 * The confidence score (docs/confianza.md) in words for the cards (HU-52): it measures how
 * complete the data is, so most sites (30-35 points: base data only) read as "básicos" rather
 * than as untrustworthy.
 */
export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return { label: "Datos completos", dots: 3 };
  if (score >= 50) return { label: "Datos intermedios", dots: 2 };
  return { label: "Datos básicos", dots: 1 };
}
