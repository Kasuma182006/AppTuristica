import { parseArgs } from "node:util";
import type { IngestSource } from "./sources/types";

/**
 * Picks the sources to run from the CLI arguments (without `node` and the script path):
 * none → all sources, `--source=<name>` → only that one. Throws on unknown names or flags.
 */
export function selectSources(
  args: readonly string[],
  available: readonly IngestSource[],
): IngestSource[] {
  const { values } = parseArgs({
    args: [...args],
    options: { source: { type: "string" } },
    strict: true,
    allowPositionals: false,
  });

  if (values.source === undefined) return [...available];

  const source = available.find((s) => s.name === values.source);
  if (!source) {
    const names = available.map((s) => `${s.name} (${s.description})`).join(", ");
    throw new Error(`Unknown source "${values.source}". Available: ${names}`);
  }
  return [source];
}
