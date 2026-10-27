/** Card placeholders shaped like PlaceCard while the first results load (HU-56). */
export function ResultsSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Buscando sitios…
      </p>
      <div aria-hidden="true" className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded-md bg-surface" />
        <ul className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((card) => (
            <li key={card} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="aspect-[16/9] w-full animate-pulse bg-border/40" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-border/60" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-border/60" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
