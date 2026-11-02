import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";

// MapLibre 6 looks for its worker next to its own file, which the bundle does not keep: this
// makes Next.js publish the worker as a static file and tells MapLibre where it is.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

/** MapLibre draws with WebGL; old devices or disabled graphics cannot show the map. */
export function canDrawMaps(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
