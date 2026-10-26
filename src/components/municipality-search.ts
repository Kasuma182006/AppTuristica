/** Lowercase without accents, e.g. "El Águila" → "el aguila". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Options whose name has a word starting with the query, ignoring accents and case
 * ("aguila" → El Águila, "el ag" → El Águila, "bu" → Buenaventura, Buga…). All of them for
 * an empty query. Keeps the given order.
 */
export function matchByWordStart<T extends { name: string }>(
  options: readonly T[],
  query: string,
): T[] {
  const needle = normalizeForSearch(query);
  if (!needle) return [...options];
  return options.filter((option) => {
    const name = normalizeForSearch(option.name);
    return name.startsWith(needle) || name.includes(` ${needle}`);
  });
}

/** Next highlighted option for an arrow key, wrapping around; -1 when there are none. */
export function moveActive(current: number, delta: 1 | -1, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/** "1 sitio", "21 sitios". */
export function placeCountLabel(count: number): string {
  return count === 1 ? "1 sitio" : `${count} sitios`;
}
