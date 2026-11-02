/** Map symbols explained under a map; same colors as map-canvas.tsx. */
export function MapLegend({ exact, approximate }: { exact: boolean; approximate: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
      {exact ? (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 rounded-full border-2 border-white bg-[#1f6f4a] ring-1 ring-[#1f6f4a]"
          />
          Ubicación exacta
        </li>
      ) : null}
      {approximate ? (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-[#c9772b] bg-[#c9772b]/20"
          />
          Área aproximada (sitio frágil, 2 km)
        </li>
      ) : null}
    </ul>
  );
}
