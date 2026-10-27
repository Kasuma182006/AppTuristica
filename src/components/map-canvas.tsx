"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { PlacePoint } from "@/modules/places/types";
import {
  boundsOf,
  FRAGILE_AREA_RADIUS,
  MAP_LOCALE,
  MAP_STYLE_URL,
  OSM_ATTRIBUTION,
  sitesAt,
  toFeatureCollection,
  type MapPointProperties,
} from "./map-data";

// MapLibre 6 looks for its worker next to its own file, which the bundle does not keep: this
// makes Next.js publish the worker as a static file and tells MapLibre where it is.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const SOURCE_ID = "places";
const POINTS_LAYER = "places-points";
const AREAS_LAYER = "places-areas";
// The light map style keeps its colors in dark mode too: the light theme's primary and accent.
const POINT_COLOR = "#1f6f4a";
const AREA_COLOR = "#c9772b";
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

/** The summary of the sites under a click (HU-58), built as DOM so names are never HTML. */
function summary(sites: MapPointProperties[], more: number): HTMLElement {
  const list = document.createElement("ul");
  list.className = "space-y-2 text-sm text-[#1c2321]";
  for (const site of sites) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `/lugar/${site.slug}`;
    link.textContent = site.name;
    link.className = "font-semibold text-[#1f6f4a] underline";
    const meta = document.createElement("p");
    meta.textContent = `${site.municipality} · ${site.placeType}`;
    meta.className = "text-[#5b6661]";
    item.append(link, meta);
    if (site.approximate) {
      const note = document.createElement("p");
      note.textContent = "Ubicación aproximada (2 km)";
      note.className = "text-[#5b6661]";
      item.append(note);
    }
    list.append(item);
  }
  if (more > 0) {
    const rest = document.createElement("li");
    rest.textContent = `y ${more} más: acerca el mapa para verlos.`;
    rest.className = "text-[#5b6661]";
    list.append(rest);
  }
  return list;
}

/**
 * The results on a MapLibre map with OpenFreeMap tiles (HU-57, HU-58): exact sites as green
 * points, fragile ones as an amber area of their real approximate radius. A click or tap shows
 * a summary with links. Loaded only in the map view (see PlacesMap).
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
    const popup = new Popup({ maxWidth: "18rem", focusAfterOpen: true });

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection(pointsRef.current) });
      map.addLayer({
        id: AREAS_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "approximate"], true],
        paint: {
          "circle-radius": FRAGILE_AREA_RADIUS,
          "circle-color": AREA_COLOR,
          "circle-opacity": 0.2,
          "circle-stroke-width": 2,
          "circle-stroke-color": AREA_COLOR,
          "circle-pitch-alignment": "map",
        },
      });
      map.addLayer({
        id: POINTS_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "approximate"], false],
        paint: {
          "circle-radius": 6,
          "circle-color": POINT_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    const showSummary = (event: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [POINTS_LAYER, AREAS_LAYER],
      });
      const { shown, more } = sitesAt(
        features.map((feature) => ({ properties: feature.properties as MapPointProperties })),
      );
      if (shown.length === 0) return;
      popup.setLngLat(event.lngLat).setDOMContent(summary(shown, more)).addTo(map);
    };
    for (const layer of [POINTS_LAYER, AREAS_LAYER]) {
      map.on("click", layer, showSummary);
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }

    mapRef.current = map;
    return () => {
      popup.remove();
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
