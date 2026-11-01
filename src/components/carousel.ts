/** The slide in view, from the track's scroll position. */
export function slideAt(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count === 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)));
}
