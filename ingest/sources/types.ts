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
  run(): Promise<void>;
}
