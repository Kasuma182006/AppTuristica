/** A travel agency of the Registro Nacional de Turismo (HU-32), as a site page lists it. */
export interface Agency {
  rntNumber: number;
  name: string;
  /** Only for companies: natural persons' contact data is personal and never imported. */
  phone: string | null;
  email: string | null;
}

/** Some of a municipality's active agencies, and how many it has in all (HU-66). */
export interface MunicipalityAgencies {
  total: number;
  /** Chosen at random on each visit, those with contact data first. */
  shown: Agency[];
}

/** Agencies a site page shows at most. */
export const AGENCIES_SHOWN = 6;
