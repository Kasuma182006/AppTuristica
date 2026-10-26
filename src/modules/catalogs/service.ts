import { getDb } from "@/lib/db";
import { findCatalogs } from "./repository";
import type { Catalogs } from "./types";

/** Filter values for the web and `GET /api/v1/catalogs` (HU-35). */
export function getCatalogs(): Promise<Catalogs> {
  return findCatalogs(getDb());
}
