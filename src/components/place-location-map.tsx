"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PlacePoint } from "@/modules/places/types";

const mapSize = "h-72 sm:h-96";

const placeholder = (
  <div
    className={`${mapSize} flex w-full items-center justify-center rounded-xl border border-border bg-surface`}
  >
    <p className="text-muted">Cargando mapa…</p>
  </div>
);

// MapLibre (~250 KB) only loads in the browser, once the map is about to be seen.
const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => placeholder,
});

/** How far below the screen the map starts loading, so it is ready when it scrolls in. */
const LOAD_MARGIN = "400px";

/** Zoom that fits a fragile site's 2 km area on a phone; exact sites get closer. */
const AREA_ZOOM = 12;
const POINT_ZOOM = 14;

/**
 * Where a site is (HU-61): its exact point, or the ~2 km area of a fragile site, which is never
 * more precise than the service's public location.
 */
export function PlaceLocationMap({ point }: { point: PlacePoint }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    // Every browser that can draw MapLibre maps has IntersectionObserver.
    if (!box || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: `${LOAD_MARGIN} 0px` },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={boxRef}>
      {near ? (
        <MapCanvas
          points={[point]}
          label={`Mapa de ubicación de ${point.name}`}
          maxZoom={point.location.approximate ? AREA_ZOOM : POINT_ZOOM}
          unsupportedHint={
            point.location.approximate
              ? `El sitio queda en ${point.municipality}.`
              : "Sus coordenadas están debajo."
          }
          className={mapSize}
        />
      ) : (
        placeholder
      )}
    </div>
  );
}
