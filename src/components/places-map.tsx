"use client";

import dynamic from "next/dynamic";
import type { PlacePoint } from "@/modules/places/types";

const mapBox = "h-[70vh] min-h-96 w-full rounded-xl border border-border lg:h-[36rem]";

// MapLibre (~250 KB) only loads when the map view is open, and only in the browser.
const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => (
    <div className={`${mapBox} flex animate-pulse items-center justify-center bg-surface`}>
      <p className="text-muted">Cargando mapa…</p>
    </div>
  ),
});

/** The map view of the results (HU-57, HU-58), with its legend. */
export function PlacesMap({ points }: { points: PlacePoint[] }) {
  return (
    <div className="space-y-2">
      <MapCanvas points={points} />
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <li className="flex items-center gap-2">
          {/* Same colors as map-canvas.tsx. */}
          <span
            aria-hidden="true"
            className="size-3 rounded-full border-2 border-white bg-[#1f6f4a] ring-1 ring-[#1f6f4a]"
          />
          Ubicación exacta
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-[#c9772b] bg-[#c9772b]/20"
          />
          Área aproximada (sitio frágil, 2 km)
        </li>
      </ul>
      <p className="text-sm text-muted">
        Toca un punto o un área para ver el sitio. La vista de lista tiene la misma información.
      </p>
    </div>
  );
}
