/** A filter value: its slug goes in URLs and API filters, its name is shown to people. */
export interface CatalogItem {
  slug: string;
  name: string;
}

/** Values of the Lugar, Tipo and Actividad filters (RF-28), in display order. */
export interface Catalogs {
  /** Alphabetical. */
  municipalities: CatalogItem[];
  /** By the catalog's sort order. */
  placeTypes: CatalogItem[];
  /** By the catalog's sort order. */
  activities: CatalogItem[];
}
