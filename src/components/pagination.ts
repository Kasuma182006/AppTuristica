/** A page number to link, or a gap ("…") standing for the pages left out. */
export type PageItem = number | "gap";

/**
 * The numbers of a pagination bar (HU-54): always the first and last pages, the current one and
 * `siblings` pages on each side; a gap replaces two or more missing pages, while a single missing
 * page is shown instead (a gap would take the same room).
 */
export function pageItems(current: number, totalPages: number, siblings: number): PageItem[] {
  if (totalPages < 1) return [];

  const shown = new Set([1, totalPages]);
  for (let page = current - siblings; page <= current + siblings; page++) {
    if (page >= 1 && page <= totalPages) shown.add(page);
  }

  const items: PageItem[] = [];
  let previous = 0;
  for (const page of [...shown].sort((a, b) => a - b)) {
    if (page - previous === 2) items.push(previous + 1);
    else if (page - previous > 2) items.push("gap");
    items.push(page);
    previous = page;
  }
  return items;
}
