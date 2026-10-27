"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { PlacePoint } from "@/modules/places/types";
import {
  boundsOf,
  MAP_LOCALE,
  MAP_STYLE_URL,
  OSM_ATTRIBUTION,
  toFeatureCollection,
} from "./map-data";

// MapLibre 6 looks for its worker next to its own file, which the bundle does not keep: this
// makes Next.js publish the worker as a static file and tells MapLibre where it is.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const SOURCE_ID = "places";
// The light map style keeps its colors in dark mode too: the light theme's primary green.
const POINT_COLOR = "#1f6f4a";
const FIT = { padding: 48, maxZoom: 13, duration: 0 } as const;

/** MapLibre draws with WebGL; old devices or disabled graphics cannot show the map. */
function canDrawMaps(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The results on a MapLibre map with OpenFreeMap tiles (HU-57): one point per site, the
 * fragile ones at their approximate location. Loaded only in the map view (see PlacesMap).
 */
export default function MapCanvas({ points }: { points: PlacePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointsRef = useRef(points);
  // Only rendered in the browser (see PlacesMap), so the check can run here.
  const [supported] = useState(canDrawMaps);

  useEffect(() => {
    if (!supported || !containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: boundsOf(pointsRef.current),
      fitBoundsOptions: FIT,
      locale: MAP_LOCALE,
      attributionControl: false,
      // One finger scrolls the page on phones; the wheel scrolls it on computers.
      cooperativeGestures: true,
    });
    map.addControl(new AttributionControl({ compact: false, customAttribution: OSM_ATTRIBUTION }));
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection(pointsRef.current) });
      map.addLayer({
        id: "places-points",
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 6,
          "circle-color": POINT_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [supported]);

  // New filters: same map, new points and view.
  useEffect(() => {
    pointsRef.current = points;
    const map = mapRef.current;
    const source = map?.getSource<GeoJSONSource>(SOURCE_ID);
    if (!map || !source) return;
    source.setData(toFeatureCollection(points));
    map.fitBounds(boundsOf(points), FIT);
  }, [points]);

  if (!supported) {
    return (
      <p role="alert" className="rounded-xl border border-border bg-surface p-4 text-muted">
        Tu navegador no puede mostrar el mapa. Usa la vista de lista.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa de resultados"
      className="h-[70vh] min-h-96 w-full overflow-hidden rounded-xl border border-border lg:h-[36rem]"
    />
  );
}
