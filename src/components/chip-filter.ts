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

/**
 * URL value of a filter whose options all start checked (Origen, HU-48): nothing while every
 * option is checked, since that is the same as not filtering.
 */
export function checkedParam(options: readonly { slug: string }[], checked: ReadonlySet<string>) {
  return options.every((option) => checked.has(option.slug)) ? "" : joinSelected(options, checked);
}

/** Whether a checkbox may be unchecked: at least one option must stay checked. */
export function canUncheck(checked: ReadonlySet<string>, value: string): boolean {
  return !checked.has(value) || checked.size > 1;
}
