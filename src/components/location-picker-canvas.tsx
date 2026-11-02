"use client";

import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type LngLatLike,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { Bounds } from "@/modules/catalogs/types";
import { MAP_LOCALE, MAP_STYLE_URL, OSM_ATTRIBUTION, VALLE_BOUNDS } from "./map-data";
import { canDrawMaps } from "./map-setup";

// The light map style keeps its colors in dark mode too: the light theme's primary.
const MARKER_COLOR = "#1f6f4a";
const FRAME_PADDING = 32;

export interface PickedPoint {
  lat: number;
  lng: number;
}

interface Props {
  /** The point chosen so far, on the map or typed. */
  point: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
  /** The area to show; the whole Valle while there is none. */
  frame: Bounds | null;
  /** Size of the map box. */
  className: string;
}

/**
 * Choosing a point on a map (HU-75): a click or tap puts the marker there, and the marker can be
 * dragged. One finger still scrolls the page, as on every other map. Loaded only in the browser
 * (see ProposalLocationField).
 */
export default function LocationPickerCanvas({ point, onPick, frame, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const initialFrameRef = useRef(frame);
  // Only rendered in the browser (see ProposalLocationField), so the check can run here.
  const [supported] = useState(canDrawMaps);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!supported || !containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: initialFrameRef.current ?? VALLE_BOUNDS,
      fitBoundsOptions: { padding: FRAME_PADDING, duration: 0 },
      locale: MAP_LOCALE,
      attributionControl: false,
      cooperativeGestures: true,
    });
    map.addControl(new AttributionControl({ compact: false, customAttribution: OSM_ATTRIBUTION }));
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.getCanvas().style.cursor = "crosshair";
    map.on("click", ({ lngLat }) => onPickRef.current({ lat: lngLat.lat, lng: lngLat.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [supported]);

  // The marker follows the point, whether it came from the map or from the fields. Only a new
  // position counts: other changes in the form must not bring back a view the visitor moved.
  const lat = point?.lat;
  const lng = point?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat === undefined || lng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position: LngLatLike = [lng, lat];
    if (!markerRef.current) {
      const marker = new Marker({ color: MARKER_COLOR, draggable: true });
      marker.on("dragend", () => {
        const dropped = marker.getLngLat();
        onPickRef.current({ lat: dropped.lat, lng: dropped.lng });
      });
      markerRef.current = marker.setLngLat(position).addTo(map);
    } else {
      markerRef.current.setLngLat(position);
    }
    // Only typed coordinates can fall outside the view.
    if (!map.getBounds().contains(position)) map.easeTo({ center: position });
  }, [lat, lng]);

  // A new municipality: the view moves there and the marker stays where it was.
  useEffect(() => {
    if (!frame || frame === initialFrameRef.current) return;
    initialFrameRef.current = null;
    mapRef.current?.fitBounds(frame, { padding: FRAME_PADDING });
  }, [frame]);

  if (!supported) {
    return (
      <p role="alert" className="rounded-xl border border-border bg-surface p-4 text-muted">
        Tu navegador no puede mostrar el mapa. Escribe las coordenadas del sitio abajo.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa para marcar la ubicación del sitio"
      className={`w-full overflow-hidden rounded-xl border border-border ${className}`}
    />
  );
}
