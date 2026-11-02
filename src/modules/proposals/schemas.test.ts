import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  parseCoordinate,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NAME_MIN_LENGTH,
  pointFromText,
  proposalFormValues,
  validateProposalForm,
} from "./schemas";

const valid = {
  placeName: "Charco del Burro",
  placeType: "rio",
  activities: ["bano-en-rio"],
  municipality: "dagua",
  latitude: "3.45123",
  longitude: "-76.53201",
  description: "Pozo de agua fría rodeado de bosque, a media hora de la vereda.",
};

const errorsFor = (changes: object) => {
  const result = validateProposalForm({ ...valid, ...changes });
  return result.success ? {} : result.errors;
};

describe("validateProposalForm", () => {
  it("accepts a complete form, with the coordinates as numbers", () => {
    expect(validateProposalForm(valid)).toEqual({
      success: true,
      values: { ...valid, latitude: 3.45123, longitude: -76.53201 },
    });
  });

  it("leaves activities optional", () => {
    expect(validateProposalForm({ ...valid, activities: [] }).success).toBe(true);
  });

  it("requires every other field, each with its message", () => {
    const empty = {
      placeName: "",
      placeType: "",
      activities: [],
      municipality: "",
      latitude: "",
      longitude: "",
      description: "",
    };
    expect(validateProposalForm(empty)).toEqual({
      success: false,
      errors: {
        placeName: "Escribe el nombre del sitio.",
        placeType: "Elige el tipo de sitio.",
        municipality: "Elige el municipio.",
        latitude: "Marca el sitio en el mapa o escribe su latitud.",
        longitude: "Marca el sitio en el mapa o escribe su longitud.",
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

  it("reads coordinates with a decimal comma", () => {
    const result = validateProposalForm({
      ...valid,
      latitude: "3,45123",
      longitude: " -76,53201 ",
    });
    expect(result.success && [result.values.latitude, result.values.longitude]).toEqual([
      3.45123, -76.53201,
    ]);
  });

  it("explains an invalid or impossible coordinate", () => {
    expect(errorsFor({ latitude: "abc" }).latitude).toMatch(/latitud válida/);
    expect(errorsFor({ latitude: "91" }).latitude).toMatch(/latitud válida/);
    expect(errorsFor({ longitude: "-181" }).longitude).toMatch(/longitud válida/);
    expect(errorsFor({ latitude: "90", longitude: "-180" })).toEqual({});
  });

  it("rejects what is not a form, without failing", () => {
    expect(validateProposalForm(undefined).success).toBe(false);
  });
});

describe("parseCoordinate", () => {
  it.each([
    ["3.45", 3.45],
    ["3,45", 3.45],
    ["-76.5", -76.5],
    ["  4  ", 4],
    ["0", 0],
  ])("reads %s", (text, value) => {
    expect(parseCoordinate(text)).toBe(value);
  });

  it.each(["", " ", "abc", "3.4.5", "3,4,5", "1e2", "--3", "3.", ".5", "1234", "Infinity"])(
    "rejects %j",
    (text) => {
      expect(parseCoordinate(text)).toBeNull();
    },
  );
});

describe("pointFromText", () => {
  it("gives the point when both coordinates are valid", () => {
    expect(pointFromText("3,5", "-76.5")).toEqual({ lat: 3.5, lng: -76.5 });
  });

  it("gives nothing for half-written or impossible coordinates", () => {
    expect(pointFromText("3.5", "")).toBeNull();
    expect(pointFromText("", "-76.5")).toBeNull();
    expect(pointFromText("-", "-76.5")).toBeNull();
    expect(pointFromText("91", "-76.5")).toBeNull();
    expect(pointFromText("3.5", "181")).toBeNull();
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
    data.set("latitude", "3.45");
    data.set("longitude", "-76.5");
    data.set("description", "Pozo de agua fría.");

    expect(proposalFormValues(data)).toEqual({
      placeName: "Charco",
      placeType: "rio",
      activities: ["camping", "fotografia"],
      municipality: "dagua",
      latitude: "3.45",
      longitude: "-76.5",
      description: "Pozo de agua fría.",
    });
  });

  it("counts missing fields as empty", () => {
    expect(proposalFormValues(new FormData())).toEqual({
      placeName: "",
      placeType: "",
      activities: [],
      municipality: "",
      latitude: "",
      longitude: "",
      description: "",
    });
  });
});
