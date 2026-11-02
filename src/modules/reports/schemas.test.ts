import { describe, expect, it } from "vitest";
import { reportReasonEnum } from "@db/schema";
import {
  COMMENT_MAX_LENGTH,
  REPORT_REASONS,
  reportFormValues,
  reportPlaceSchema,
  validateReportForm,
} from "./schemas";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return reportFormValues(data);
};

describe("REPORT_REASONS", () => {
  it("offers exactly the reasons the database accepts", () => {
    expect(REPORT_REASONS.map((reason) => reason.value)).toEqual(reportReasonEnum.enumValues);
  });
});

describe("validateReportForm", () => {
  it.each(REPORT_REASONS.map((reason) => reason.value))("accepts the reason %s", (reason) => {
    expect(validateReportForm(form({ reason }))).toEqual({
      success: true,
      values: { reason, comment: null },
    });
  });

  it("asks for a reason", () => {
    expect(validateReportForm(form({ comment: "Ya no está" }))).toEqual({
      success: false,
      errors: { reason: "Elige un motivo." },
    });
  });

  it("does not accept a reason outside the list", () => {
    const result = validateReportForm(form({ reason: "spam" }));

    expect(result).toEqual({ success: false, errors: { reason: "Elige un motivo." } });
  });

  it("keeps the comment without the spaces around it", () => {
    expect(
      validateReportForm(form({ reason: "dangerous", comment: "  Hay un derrumbe. " })),
    ).toEqual({ success: true, values: { reason: "dangerous", comment: "Hay un derrumbe." } });
  });

  it("takes a blank comment as none, which the database would reject", () => {
    expect(validateReportForm(form({ reason: "dangerous", comment: "   " }))).toEqual({
      success: true,
      values: { reason: "dangerous", comment: null },
    });
  });

  it("limits the comment, not counting the spaces around it", () => {
    const longest = "a".repeat(COMMENT_MAX_LENGTH);

    expect(validateReportForm(form({ reason: "dangerous", comment: ` ${longest} ` })).success).toBe(
      true,
    );
    expect(validateReportForm(form({ reason: "dangerous", comment: `${longest}a` }))).toEqual({
      success: false,
      errors: { comment: `El comentario puede tener hasta ${COMMENT_MAX_LENGTH} caracteres.` },
    });
  });

  it("reports every field with a problem", () => {
    const result = validateReportForm({ reason: "", comment: "a".repeat(COMMENT_MAX_LENGTH + 1) });

    expect(result.success ? [] : Object.keys(result.errors)).toEqual(["reason", "comment"]);
  });
});

describe("reportPlaceSchema", () => {
  it.each(["embalse-de-calima", "rio-2-cali"])("accepts the address %s", (slug) => {
    expect(reportPlaceSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["", "Calima", "a b", "a--b", "-a", null, 7])("rejects %o", (value) => {
    expect(reportPlaceSchema.safeParse(value).success).toBe(false);
  });
});
