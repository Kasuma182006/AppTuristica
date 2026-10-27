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

/** The map view of the results (HU-57). */
export function PlacesMap({ points }: { points: PlacePoint[] }) {
  return <MapCanvas points={points} />;
}
