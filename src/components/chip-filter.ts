/** Adds the value when absent, removes it when present. */
export function toggleValue(selected: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(value)) next.add(value);
  return next;
}

/**
 * URL value of a multiple filter: the chosen slugs comma-separated, in display order
 * (e.g. "cascada,rio"), so the same choice always gives the same URL.
 */
export function joinSelected(options: readonly { slug: string }[], selected: ReadonlySet<string>) {
  return options
    .filter((option) => selected.has(option.slug))
    .map((option) => option.slug)
    .join(",");
}
