import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Keep in sync with "paths" in tsconfig.json.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@db": fileURLToPath(new URL("./db", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["{src,db,ingest}/**/*.test.ts"],
  },
});
