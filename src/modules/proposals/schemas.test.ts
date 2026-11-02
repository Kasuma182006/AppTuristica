import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NAME_MIN_LENGTH,
  proposalFormValues,
  validateProposalForm,
} from "./schemas";

const valid = {
  placeName: "Charco del Burro",
  placeType: "rio",
  activities: ["bano-en-rio"],
  municipality: "dagua",
  description: "Pozo de agua fría rodeado de bosque, a media hora de la vereda.",
};

const errorsFor = (changes: object) => {
  const result = validateProposalForm({ ...valid, ...changes });
  return result.success ? {} : result.errors;
};

describe("validateProposalForm", () => {
  it("accepts a complete form", () => {
    expect(validateProposalForm(valid)).toEqual({ success: true, values: valid });
  });

  it("leaves activities optional", () => {
    expect(validateProposalForm({ ...valid, activities: [] }).success).toBe(true);
  });

  it("requires name, type, municipality and description, each with its message", () => {
    const empty = {
      placeName: "",
      placeType: "",
      activities: [],
      municipality: "",
      description: "",
    };
    expect(validateProposalForm(empty)).toEqual({
      success: false,
      errors: {
        placeName: "Escribe el nombre del sitio.",
        placeType: "Elige el tipo de sitio.",
        municipality: "Elige el municipio.",
        description: "Escribe una descripción del sitio.",
      },
    });
  });

  it("treats a text of only spaces as empty", () => {
    expect(errorsFor({ placeName: "    ", description: "    " })).toEqual({
      placeName: "Escribe el nombre del sitio.",
      description: "Escribe una descripción del sitio.",
    });
  });

  it("does not count the spaces around a text", () => {
    expect(errorsFor({ placeName: "  ab  " }).placeName).toMatch(/al menos 3/);
    const result = validateProposalForm({ ...valid, placeName: "  Charco  " });
    expect(result.success && result.values.placeName).toBe("Charco");
  });

  it.each([
    ["placeName", PLACE_NAME_MIN_LENGTH, PLACE_NAME_MAX_LENGTH],
    ["description", DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH],
  ])("limits the length of %s", (field, min, max) => {
    expect(errorsFor({ [field]: "a".repeat(min - 1) })).toHaveProperty(field);
    expect(errorsFor({ [field]: "a".repeat(min) })).toEqual({});
    expect(errorsFor({ [field]: "a".repeat(max) })).toEqual({});
    expect(errorsFor({ [field]: "a".repeat(max + 1) })).toHaveProperty(field);
  });

  it("rejects what is not a form, without failing", () => {
    expect(validateProposalForm(undefined).success).toBe(false);
  });
});

describe("proposalFormValues", () => {
  it("reads every field, with all the activities", () => {
    const data = new FormData();
    data.set("placeName", "Charco");
    data.set("placeType", "rio");
    data.append("activities", "camping");
    data.append("activities", "fotografia");
    data.set("municipality", "dagua");
    data.set("description", "Pozo de agua fría.");

    expect(proposalFormValues(data)).toEqual({
      placeName: "Charco",
      placeType: "rio",
      activities: ["camping", "fotografia"],
      municipality: "dagua",
      description: "Pozo de agua fría.",
    });
  });

  it("counts missing fields as empty", () => {
    expect(proposalFormValues(new FormData())).toEqual({
      placeName: "",
      placeType: "",
      activities: [],
      municipality: "",
      description: "",
    });
  });
});
