import type { ExpressionSpecification } from "maplibre-gl";
import { APPROX_RADIUS_M } from "@/lib/geo";
import type { PlacePoint } from "@/modules/places/types";

/** OpenFreeMap's vector style: free, no key (CLAUDE.md). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Required on every map (CLAUDE.md). The tiles credit OpenStreetMap as "Data from
 * OpenStreetMap", so the exact wording is added on top.
 */
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';

/** West, south, east, north of the Valle del Cauca, used when there is nothing to fit. */
export const VALLE_BOUNDS: [number, number, number, number] = [-77.6, 3.0, -75.7, 5.1];

/** MapLibre's interface texts in Spanish (RNF-06: Spanish only). */
export const MAP_LOCALE: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Mostrar u ocultar la atribución",
  "AttributionControl.MapFeedback": "Comentarios sobre el mapa",
  "FullscreenControl.Enter": "Pantalla completa",
  "FullscreenControl.Exit": "Salir de pantalla completa",
  "LogoControl.Title": "Logo de MapLibre",
  "Map.Title": "Mapa",
  "Marker.Title": "Marcador",
  "NavigationControl.ResetBearing": "Arrastra para girar el mapa; clic para volver al norte",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "Popup.Close": "Cerrar",
  "ScaleControl.Meters": "m",
  "ScaleControl.Kilometers": "km",
  "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar el mapa",
  "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar el mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
};

/** What the map keeps of each site, enough for its summary (HU-58). */
export interface MapPointProperties {
  slug: string;
  name: string;
  municipality: string;
  placeType: string;
  approximate: boolean;
}

export interface PointFeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: MapPointProperties;
  }[];
}

/** The sites as GeoJSON for the map source; locations are already public (approximate if fragile). */
export function toFeatureCollection(points: readonly PlacePoint[]): PointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.location.lng, point.location.lat] },
      properties: {
        slug: point.slug,
        name: point.name,
        municipality: point.municipality,
        placeType: point.placeType.name,
        approximate: point.location.approximate,
      },
    })),
  };
}

/** Pixels per meter at a zoom level (Web Mercator, 512 px tiles), near the latitude given. */
export function pixelsPerMeter(zoom: number, latitude: number): number {
  const metersPerPixelAtZoom0 = 78271.517 * Math.cos((latitude * Math.PI) / 180);
  return 2 ** zoom / metersPerPixelAtZoom0;
}

/** Latitude for the radius scale; Colombia spans 0-12° N, where it changes less than 3 %. */
const SCALE_LATITUDE = 4;
/** From this zoom on, a fragile area is drawn at its real size. */
const REAL_SIZE_ZOOM = 10;
/** Its radius in pixels when zoomed out, so it stays visible. */
const MIN_AREA_PIXELS = 7;

/**
 * Circle radius of a fragile site's area (HU-58): its real size (APPROX_RADIUS_M) from zoom 10
 * on, growing smoothly from a visible minimum when zoomed out.
 */
export const FRAGILE_AREA_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["exponential", 2],
  ["zoom"],
  0,
  MIN_AREA_PIXELS,
  REAL_SIZE_ZOOM,
  APPROX_RADIUS_M * pixelsPerMeter(REAL_SIZE_ZOOM, SCALE_LATITUDE),
  22,
  APPROX_RADIUS_M * pixelsPerMeter(22, SCALE_LATITUDE),
];

/** Most sites listed in one summary; the rest are counted. */
export const MAX_SUMMARY_SITES = 6;

/**
 * The sites under a click or tap (HU-58), once each: fragile sites of one grid cell share their
 * point, and an area can sit on top of others.
 */
export function sitesAt(features: readonly { properties: MapPointProperties }[]): {
  shown: MapPointProperties[];
  more: number;
} {
  const unique = [...new Map(features.map((f) => [f.properties.slug, f.properties])).values()];
  return {
    shown: unique.slice(0, MAX_SUMMARY_SITES),
    more: Math.max(0, unique.length - MAX_SUMMARY_SITES),
  };
}

/** Sites farther than this from the middle of the rest are left out of the first view. */
export const OUTLIER_DEGREES = 2.5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * West, south, east, north around the sites, or the whole Valle when there are none. Faraway
 * sites (Malpelo island, ~500 km off the coast) stay on the map but out of the first view, which
 * would otherwise be mostly ocean.
 */
export function boundsOf(points: readonly PlacePoint[]): [number, number, number, number] {
  if (points.length === 0) return VALLE_BOUNDS;
  const centerLng = median(points.map((point) => point.location.lng));
  const centerLat = median(points.map((point) => point.location.lat));
  const near = points.filter(
    ({ location }) =>
      Math.abs(location.lng - centerLng) <= OUTLIER_DEGREES &&
      Math.abs(location.lat - centerLat) <= OUTLIER_DEGREES,
  );
  const framed = near.length > 0 ? near : points;
  const lngs = framed.map((point) => point.location.lng);
  const lats = framed.map((point) => point.location.lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
