import { slugify } from "@/lib/slug";

/** Words that say nothing about which place it is: "Charco del Burro" is "Charco el Burro". */
const LINKING_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "al", "a"]);

function significantWords(name: string): string[] {
  return slugify(name)
    .split("-")
    .filter((word) => word && !LINKING_WORDS.has(word));
}

/**
 * Whether two names may be the same place (HU-81): every significant word of the shorter one is
 * in the other, without accents or capitals. Looser than the ingest's check, which merges sites:
 * here a wrong match only costs the visitor one click.
 */
export function similarPlaceNames(a: string, b: string): boolean {
  const [shorter = [], longer = []] = [significantWords(a), significantWords(b)].sort(
    (x, y) => x.length - y.length,
  );
  return shorter.length > 0 && shorter.every((word) => longer.includes(word));
}
