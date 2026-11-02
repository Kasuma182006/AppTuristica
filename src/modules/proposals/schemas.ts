import { z } from "zod";
import type { CostSlug } from "@/modules/places/types";

/** Sent when the visitor says the proposal is none of the sites offered as duplicates (HU-81). */
export const NOT_DUPLICATE_FIELD = "notDuplicate";

export const PLACE_NAME_MIN_LENGTH = 3;
export const PLACE_NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 20;
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * A coordinate as a person writes it, with a decimal point or comma; null when it is not one.
 * Whether it falls inside the Valle is for the server (HU-80), which has the real boundary.
 */
export function parseCoordinate(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  return /^-?[0-9]{1,3}([.][0-9]+)?$/.test(normalized) ? Number(normalized) : null;
}

const isLatitude = (value: number | null) => value !== null && Math.abs(value) <= 90;
const isLongitude = (value: number | null) => value !== null && Math.abs(value) <= 180;

/** The point in two texts, when both are valid; null while they are empty or half-written. */
export function pointFromText(
  latitude: string,
  longitude: string,
): { lat: number; lng: number } | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  return lat !== null && lng !== null && isLatitude(lat) && isLongitude(lng) ? { lat, lng } : null;
}

const coordinate = (
  emptyMessage: string,
  isValid: (value: number | null) => boolean,
  invalidMessage: string,
) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .refine((text) => isValid(parseCoordinate(text)), invalidMessage)
    .transform((text) => Number(text.replace(",", ".")));

/**
 * The proposal form (HU-74, HU-75, RF-19). Runs in the browser, and the server will run it too
 * (HU-80), where it must also check that the chosen slugs exist. Spaces around a text do not count.
 */
export const proposalFormSchema = z.object({
  // Not "name": browsers would offer to fill in the visitor's own name.
  placeName: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del sitio.")
    .min(
      PLACE_NAME_MIN_LENGTH,
      `El nombre debe tener al menos ${PLACE_NAME_MIN_LENGTH} caracteres.`,
    )
    .max(PLACE_NAME_MAX_LENGTH, `El nombre puede tener hasta ${PLACE_NAME_MAX_LENGTH} caracteres.`),
  placeType: z.string().min(1, "Elige el tipo de sitio."),
  activities: z
    .array(z.string("Elige las actividades de la lista."))
    .transform((slugs) => [...new Set(slugs)]),
  municipality: z.string().min(1, "Elige el municipio."),
  latitude: coordinate(
    "Marca el sitio en el mapa o escribe su latitud.",
    isLatitude,
    "Escribe una latitud válida, por ejemplo 3.45123.",
  ),
  longitude: coordinate(
    "Marca el sitio en el mapa o escribe su longitud.",
    isLongitude,
    "Escribe una longitud válida, por ejemplo -76.53201.",
  ),
  description: z
    .string()
    .trim()
    .min(1, "Escribe una descripción del sitio.")
    .min(
      DESCRIPTION_MIN_LENGTH,
      `La descripción debe tener al menos ${DESCRIPTION_MIN_LENGTH} caracteres.`,
    )
    .max(
      DESCRIPTION_MAX_LENGTH,
      `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    ),
  // Empty is "No sé": the site is saved with no cost, as if the field did not exist (HU-76).
  cost: z
    .enum(["gratis", "pago", ""], "Elige una opción de costo de entrada.")
    .transform((value): CostSlug | null => value || null),
  // Marked: the exact point is never shown (HU-77, CLAUDE.md).
  fragile: z.boolean(),
  // Must be marked: without it the proposal is not sent (HU-78).
  acceptedTerms: z.literal(true, "Acepta los términos de uso para poder enviar tu propuesta."),
});

export type ProposalFormValues = z.infer<typeof proposalFormSchema>;

export type ProposalField = keyof ProposalFormValues;

/** The message of each field with a problem. */
export type ProposalErrors = Partial<Record<ProposalField, string>>;

/** Fields in the order they appear, to take the visitor to the first one with a problem. */
export const PROPOSAL_FIELDS = [
  "placeName",
  "placeType",
  "activities",
  "municipality",
  "latitude",
  "longitude",
  "description",
  "cost",
  "fragile",
  "acceptedTerms",
] as const satisfies readonly ProposalField[];

/** Reads the form as sent by the browser; a field that is missing counts as empty. */
export function proposalFormValues(data: FormData): Record<ProposalField, unknown> {
  const text = (field: ProposalField) => {
    const value = data.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    placeName: text("placeName"),
    placeType: text("placeType"),
    activities: data.getAll("activities"),
    municipality: text("municipality"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    description: text("description"),
    cost: text("cost"),
    // A checkbox is only sent when it is marked.
    fragile: data.has("fragile"),
    acceptedTerms: data.has("acceptedTerms"),
  };
}

export type ProposalValidation =
  { success: true; values: ProposalFormValues } | { success: false; errors: ProposalErrors };

/** Validates the form and keeps the first message of each field, the one to fix first. */
export function validateProposalForm(values: unknown): ProposalValidation {
  const result = proposalFormSchema.safeParse(values);
  if (result.success) return { success: true, values: result.data };

  const errors: ProposalErrors = {};
  for (const issue of result.error.issues) {
    const field = PROPOSAL_FIELDS.find((name) => name === issue.path[0]);
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}
