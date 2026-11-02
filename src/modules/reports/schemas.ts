import { z } from "zod";

/** The hidden field with the site being reported. */
export const REPORT_PLACE_FIELD = "place";

export const COMMENT_MAX_LENGTH = 500;

/** How long a report is kept, with the hash of its IP (RNF-05). */
export const REPORT_RETENTION_DAYS = 180;

/** The reasons offered (RF-22), with the values of the database's report_reason. */
export const REPORT_REASONS = [
  { value: "not_exists", label: "No existe" },
  { value: "wrong_location", label: "Ubicación incorrecta" },
  { value: "false_info", label: "Información falsa" },
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "dangerous", label: "Peligroso" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

const reasonValues = REPORT_REASONS.map((reason) => reason.value) as [
  ReportReason,
  ...ReportReason[],
];

/** The address of a site, as the database accepts it (places_slug_format). */
export const reportPlaceSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** The report form (HU-84, RF-22). Runs in the browser and again on the server. */
export const reportFormSchema = z.object({
  reason: z.enum(reasonValues, "Elige un motivo."),
  // Empty means no comment: the database does not accept a blank one (reports_comment_valid).
  comment: z
    .string()
    .trim()
    .max(COMMENT_MAX_LENGTH, `El comentario puede tener hasta ${COMMENT_MAX_LENGTH} caracteres.`)
    .transform((text) => text || null),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;

export type ReportField = keyof ReportFormValues;

/** The message of each field with a problem. */
export type ReportErrors = Partial<Record<ReportField, string>>;

/** Fields in the order they appear, to take the visitor to the first one with a problem. */
export const REPORT_FIELDS = ["reason", "comment"] as const satisfies readonly ReportField[];

/** Reads the form as sent by the browser; a field that is missing counts as empty. */
export function reportFormValues(data: FormData): Record<ReportField, unknown> {
  const text = (field: ReportField) => {
    const value = data.get(field);
    return typeof value === "string" ? value : "";
  };
  return { reason: text("reason"), comment: text("comment") };
}

export type ReportValidation =
  { success: true; values: ReportFormValues } | { success: false; errors: ReportErrors };

/** Validates the form and keeps the first message of each field. */
export function validateReportForm(values: unknown): ReportValidation {
  const result = reportFormSchema.safeParse(values);
  if (result.success) return { success: true, values: result.data };

  const errors: ReportErrors = {};
  for (const issue of result.error.issues) {
    const field = REPORT_FIELDS.find((name) => name === issue.path[0]);
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}
