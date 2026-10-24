import type { IngestSource } from "./types";

// Tourist sites from OpenStreetMap. The Overpass query and pipeline arrive in HU-21 onwards.
export const osmSource: IngestSource = {
  name: "osm",
  description: "sitios de OpenStreetMap",
  async run() {
    console.log("osm: not implemented yet (HU-21)");
  },
};
