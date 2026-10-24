import type { IngestSource } from "./types";

// Travel agencies from the RNT (datos.gov.co) into `agencies`. Implemented in HU-32.
export const rntSource: IngestSource = {
  name: "rnt",
  description: "agencias del Registro Nacional de Turismo",
  async run() {
    console.log("rnt: not implemented yet (HU-32)");
  },
};
