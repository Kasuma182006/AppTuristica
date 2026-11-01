"use client";

import dynamic from "next/dynamic";
import type { PlacePoint } from "@/modules/places/types";
import { MapLegend } from "./map-legend";

const mapSize = "h-[70vh] min-h-96 lg:h-[36rem]";

// MapLibre (~250 KB) only loads when the map view is open, and only in the browser.
const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => (
    <div
      className={`${mapSize} flex w-full animate-pulse rounded-xl border border-border items-center justify-center bg-surface`}
    >
      <p className="text-muted">Cargando mapa…</p>
    </div>
  ),
});

/** The map view of the results (HU-57, HU-58), with its legend. */
export function PlacesMap({ points }: { points: PlacePoint[] }) {
  return (
    <div className="space-y-2">
      <MapCanvas
        points={points}
        label="Mapa de resultados"
        summaries
        unsupportedHint="Usa la vista de lista."
        className={mapSize}
      />
      <MapLegend exact approximate />
      <p className="text-sm text-muted">
        Toca un punto o un área para ver el sitio. La vista de lista tiene la misma información.
      </p>
    </div>
  );
}
