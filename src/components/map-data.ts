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

export interface PointFeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { slug: string; name: string; placeType: string; approximate: boolean };
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
        placeType: point.placeType.slug,
        approximate: point.location.approximate,
      },
    })),
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
