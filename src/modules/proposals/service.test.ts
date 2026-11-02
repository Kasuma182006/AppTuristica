import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile";
import { getCatalogs, locateInMunicipality } from "@/modules/catalogs/service";
import { catalogErrors, receiveProposal } from "./service";

vi.mock("@/modules/catalogs/service", () => ({
  getCatalogs: vi.fn(),
  locateInMunicipality: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

const catalogs = {
  placeTypes: [{ slug: "rio", name: "Río" }],
  activities: [{ slug: "camping", name: "Camping" }],
  municipalities: [
    { slug: "cali", name: "Cali" },
    { slug: "palmira", name: "Palmira" },
  ],
};

const inCali = { slug: "cali", name: "Cali", point: { lat: 3.45, lon: -76.53 } };

const validFields: Record<string, string> = {
  [TURNSTILE_TOKEN_FIELD]: "token",
  placeName: "Charco del Burro",
  placeType: "rio",
  activities: "camping",
  municipality: "cali",
  latitude: "3.45",
  longitude: "-76.53",
  description: "Pozo de agua fría rodeado de bosque, cerca de la vereda.",
  cost: "",
  acceptedTerms: "on",
};

const form = (changes: Record<string, string | File | null> = {}) => {
  const data = new FormData();
  for (const [field, value] of Object.entries({ ...validFields, ...changes })) {
    if (value !== null) data.set(field, value);
  }
  return data;
};

const cloudflareAnswers = (success: boolean) =>
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ success })));

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubGlobal("fetch", fetchMock);
  cloudflareAnswers(true);
  vi.mocked(getCatalogs).mockResolvedValue(catalogs);
  vi.mocked(locateInMunicipality).mockResolvedValue(inCali);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("receiveProposal: Turnstile (HU-79)", () => {
  it("receives a valid proposal with a token Cloudflare accepts", async () => {
    await expect(receiveProposal(form())).resolves.toEqual({ status: "received" });
  });

  it("rejects a token Cloudflare rejects, before touching the database", async () => {
    cloudflareAnswers(false);
    await expect(receiveProposal(form())).resolves.toEqual({ status: "not-verified" });
    expect(locateInMunicipality).not.toHaveBeenCalled();
    expect(getCatalogs).not.toHaveBeenCalled();
  });

  it("rejects a proposal without a token, or with a file in its place", async () => {
    await expect(receiveProposal(form({ [TURNSTILE_TOKEN_FIELD]: null }))).resolves.toEqual({
      status: "not-verified",
    });
    await expect(
      receiveProposal(form({ [TURNSTILE_TOKEN_FIELD]: new File(["x"], "token.txt") })),
    ).resolves.toEqual({ status: "not-verified" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("receiveProposal: fields (HU-80)", () => {
  it("returns each field's error when the browser's checks were skipped", async () => {
    const result = await receiveProposal(form({ placeName: "", description: "corta" }));
    expect(result).toEqual({
      status: "invalid",
      errors: {
        placeName: "Escribe el nombre del sitio.",
        description: "La descripción debe tener al menos 20 caracteres.",
      },
    });
    expect(locateInMunicipality).not.toHaveBeenCalled();
  });

  it("rejects a form without the terms accepted", async () => {
    const result = await receiveProposal(form({ acceptedTerms: null }));
    expect(result.status === "invalid" && result.errors).toHaveProperty("acceptedTerms");
  });

  it("rejects an activity sent as a file, with a message in Spanish", async () => {
    const result = await receiveProposal(form({ activities: new File(["x"], "a.txt") }));
    expect(result.status === "invalid" && result.errors.activities).toBe(
      "Elige las actividades de la lista.",
    );
  });

  it("rejects values that are not in the lists", async () => {
    const result = await receiveProposal(form({ placeType: "volcan", activities: "surf" }));
    expect(result).toEqual({
      status: "invalid",
      errors: {
        placeType: "Elige un tipo de sitio de la lista.",
        activities: "Elige las actividades de la lista.",
      },
    });
  });

  it("rejects a point outside the Valle, on the latitude field", async () => {
    vi.mocked(locateInMunicipality).mockResolvedValue(null);
    await expect(receiveProposal(form())).resolves.toEqual({
      status: "invalid",
      errors: {
        latitude: "Ese punto queda fuera del Valle del Cauca. Márcalo dentro del departamento.",
      },
    });
  });

  it("asks for the coordinates the visitor wrote, with a decimal comma", async () => {
    await receiveProposal(form({ latitude: "3,45", longitude: "-76,53" }));
    expect(locateInMunicipality).toHaveBeenCalledWith({ lat: 3.45, lon: -76.53 });
  });

  it("corrects a municipality the point is not in, for the visitor to review", async () => {
    await expect(receiveProposal(form({ municipality: "palmira" }))).resolves.toEqual({
      status: "invalid",
      errors: {
        municipality: "El punto queda en Cali: cambiamos el municipio. Revísalo y envía de nuevo.",
      },
      suggestedMunicipality: "cali",
    });
  });

  it("corrects a municipality that does not exist too", async () => {
    const result = await receiveProposal(form({ municipality: "gotham" }));
    expect(result.status === "invalid" && result.suggestedMunicipality).toBe("cali");
  });

  it("fails when the database fails, so the visitor can try again", async () => {
    vi.mocked(getCatalogs).mockRejectedValue(new Error("database down"));
    await expect(receiveProposal(form())).rejects.toThrow("database down");
  });
});

describe("catalogErrors", () => {
  it("has nothing to say about values in the lists, or about no activities", () => {
    expect(catalogErrors({ placeType: "rio", activities: ["camping"] }, catalogs)).toEqual({});
    expect(catalogErrors({ placeType: "rio", activities: [] }, catalogs)).toEqual({});
  });
});
