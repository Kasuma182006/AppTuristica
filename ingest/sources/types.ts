import type { IngestDb } from "../db";

/** Shared by every source during one `npm run ingest`. */
export interface IngestContext {
  db: IngestDb;
}

/** What one source run did (sites for osm, agencies for rnt), recorded in ingest_runs (HU-33). */
export interface SourceStats {
  created: number;
  updated: number;
  unchanged: number;
  /** Sites deleted (unseen for 30 days or merged into an older one), agencies made inactive. */
  removed: number;
  /** Items left out by validation; their reasons are only in the run log. */
  discarded: number;
  /** One message per item that could not be saved; the source saved the rest. */
  errors: string[];
}

/**
 * A source that can be run on its own with `npm run ingest -- --source=<name>`.
 * Enrichment sources (Wikidata, Commons) are not ingest sources: they run as steps inside the
 * `osm` run (HU-27, HU-28).
 */
export interface IngestSource {
  /** CLI name, lowercase: `--source=<name>`. */
  name: string;
  /** Spanish description shown in the command's error message. */
  description: string;
  run(context: IngestContext): Promise<SourceStats>;
}
