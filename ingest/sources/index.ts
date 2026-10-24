import { osmSource } from "./osm";
import { rntSource } from "./rnt";
import type { IngestSource } from "./types";

// Every source run by `npm run ingest`, in this order. Adding a source only means adding it here.
// osm goes first: agencies do not depend on sites, but sites are the main data.
export const sources: readonly IngestSource[] = [osmSource, rntSource];
