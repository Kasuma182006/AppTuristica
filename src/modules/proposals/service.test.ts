import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashIp } from "@/lib/ip-hash";
import { consumeRateLimit, PROPOSAL_RATE_LIMIT } from "@/lib/rate-limit";
import { TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile";
import { getCatalogs, locateInMunicipality } from "@/modules/catalogs/service";
import { findPossibleDuplicates } from "@/modules/places/service";
import { NOT_DUPLICATE_FIELD } from "./schemas";
import { saveCommunityPlace } from "./repository";
import { catalogErrors, limitMessage, receiveProposal, toNewCommunityPlace } from "./service";

vi.mock("@/modules/catalogs/service", () => ({
  getCatalogs: vi.fn(),
  locateInMunicipality: vi.fn(),
}));

vi.mock("./repository", () => ({ saveCommunityPlace: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit: vi.fn(),
}));
vi.mock("@/modules/places/service", () => ({
  findPossibleDuplicates: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

const SECRET = "a".repeat(64);
const visitor = new Headers({ "x-real-ip": "203.0.113.7" });
const receive = (data: FormData) => receiveProposal(data, visitor);

const catalogs = {
  placeTypes: [{ slug: "rio", name: "Río" }],
  activities: [{ slug: "camping", name: "Camping" }],
  municipalities: [
    { slug: "cali", name: "Cali" },
    { slug: "palmira", name: "Palmira" },
  ],
};

const inCali = {
  slug: "cali",
  name: "Cali",
  municipalityId: 7,
  point: { lat: 3.45, lon: -76.53 },
};

const published = {
  status: "published",
  slug: "charco-del-burro-cali",
  name: "Charco del Burro",
  fragile: false,
};

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
  vi.stubEnv("IP_HASH_SECRET", SECRET);
  vi.stubGlobal("fetch", fetchMock);
  cloudflareAnswers(true);
  vi.mocked(getCatalogs).mockResolvedValue(catalogs);
  vi.mocked(locateInMunicipality).mockResolvedValue(inCali);
  vi.mocked(findPossibleDuplicates).mockResolvedValue([]);
  vi.mocked(saveCommunityPlace).mockResolvedValue("charco-del-burro-cali");
  vi.mocked(consumeRateLimit).mockResolvedValue({
    allowed: true,
    retryAfterS: 60,
    newWindow: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("receiveProposal: Turnstile (HU-79)", () => {
  it("publishes a valid proposal with a token Cloudflare accepts", async () => {
    await expect(receive(form())).resolves.toEqual(published);
  });

  it("rejects a token Cloudflare rejects, before touching the database", async () => {
    cloudflareAnswers(false);
    await expect(receive(form())).resolves.toEqual({ status: "not-verified" });
    expect(locateInMunicipality).not.toHaveBeenCalled();
    expect(getCatalogs).not.toHaveBeenCalled();
  });

  it("rejects a proposal without a token, or with a file in its place", async () => {
    await expect(receive(form({ [TURNSTILE_TOKEN_FIELD]: null }))).resolves.toEqual({
      status: "not-verified",
    });
    await expect(
      receive(form({ [TURNSTILE_TOKEN_FIELD]: new File(["x"], "token.txt") })),
    ).resolves.toEqual({ status: "not-verified" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("receiveProposal: fields (HU-80)", () => {
  it("returns each field's error when the browser's checks were skipped", async () => {
    const result = await receive(form({ placeName: "", description: "corta" }));
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
    const result = await receive(form({ acceptedTerms: null }));
    expect(result.status === "invalid" && result.errors).toHaveProperty("acceptedTerms");
  });

  it("rejects an activity sent as a file, with a message in Spanish", async () => {
    const result = await receive(form({ activities: new File(["x"], "a.txt") }));
    expect(result.status === "invalid" && result.errors.activities).toBe(
      "Elige las actividades de la lista.",
    );
  });

  it("rejects values that are not in the lists", async () => {
    const result = await receive(form({ placeType: "volcan", activities: "surf" }));
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
    await expect(receive(form())).resolves.toEqual({
      status: "invalid",
      errors: {
        latitude: "Ese punto queda fuera del Valle del Cauca. Márcalo dentro del departamento.",
      },
    });
  });

  it("asks for the coordinates the visitor wrote, with a decimal comma", async () => {
    await receive(form({ latitude: "3,45", longitude: "-76,53" }));
    expect(locateInMunicipality).toHaveBeenCalledWith({ lat: 3.45, lon: -76.53 });
  });

  it("corrects a municipality the point is not in, for the visitor to review", async () => {
    await expect(receive(form({ municipality: "palmira" }))).resolves.toEqual({
      status: "invalid",
      errors: {
        municipality: "El punto queda en Cali: cambiamos el municipio. Revísalo y envía de nuevo.",
      },
      suggestedMunicipality: "cali",
    });
  });

  it("corrects a municipality that does not exist too", async () => {
    const result = await receive(form({ municipality: "gotham" }));
    expect(result.status === "invalid" && result.suggestedMunicipality).toBe("cali");
  });

  it("fails when the database fails, so the visitor can try again", async () => {
    vi.mocked(getCatalogs).mockRejectedValue(new Error("database down"));
    await expect(receive(form())).rejects.toThrow("database down");
  });
});

describe("receiveProposal: duplicates (HU-81)", () => {
  const burro = { slug: "charco-del-burro", name: "Charco del Burro" };

  it("offers the sites that may be the same, looking from the located point", async () => {
    const moved = { lat: 3.46, lon: -76.54 };
    vi.mocked(locateInMunicipality).mockResolvedValue({ ...inCali, point: moved });
    vi.mocked(findPossibleDuplicates).mockResolvedValue([burro]);

    await expect(receive(form())).resolves.toEqual({
      status: "duplicate",
      duplicates: [burro],
    });
    expect(findPossibleDuplicates).toHaveBeenCalledWith(moved, "Charco del Burro");
  });

  it("continues when the visitor says it is none of them", async () => {
    vi.mocked(findPossibleDuplicates).mockResolvedValue([burro]);
    await expect(receive(form({ [NOT_DUPLICATE_FIELD]: "on" }))).resolves.toEqual(published);
    expect(findPossibleDuplicates).not.toHaveBeenCalled();
  });

  it("does not look for duplicates while something else needs fixing", async () => {
    await receive(form({ placeType: "volcan" }));
    await receive(form({ municipality: "palmira" }));
    vi.mocked(locateInMunicipality).mockResolvedValue(null);
    await receive(form());
    expect(findPossibleDuplicates).not.toHaveBeenCalled();
  });
});

describe("receiveProposal: limit per IP (HU-82)", () => {
  it("counts an accepted proposal, with the hash of the IP and never the IP", async () => {
    await expect(receive(form())).resolves.toEqual(published);
    const [, ipHash, rule] = vi.mocked(consumeRateLimit).mock.calls[0] ?? [];
    expect(ipHash).toBe(hashIp("203.0.113.7", SECRET));
    expect(ipHash).not.toContain("203.0.113.7");
    expect(rule).toBe(PROPOSAL_RATE_LIMIT);
  });

  it("rejects a proposal over the limit, saying when it can be sent", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({
      allowed: false,
      retryAfterS: 3 * 3600,
      newWindow: false,
    });
    await expect(receive(form())).resolves.toEqual({
      status: "limited",
      message: limitMessage(3 * 3600),
    });
  });

  it("does not use up the limit on anything that is not accepted", async () => {
    cloudflareAnswers(false);
    await receive(form());
    cloudflareAnswers(true);
    await receive(form({ placeName: "" }));
    await receive(form({ placeType: "volcan" }));
    await receive(form({ municipality: "palmira" }));
    vi.mocked(findPossibleDuplicates).mockResolvedValueOnce([{ slug: "a", name: "A" }]);
    await receive(form());
    vi.mocked(locateInMunicipality).mockResolvedValue(null);
    await receive(form());
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("also counts a proposal sent past the duplicate notice", async () => {
    await receive(form({ [NOT_DUPLICATE_FIELD]: "on" }));
    expect(consumeRateLimit).toHaveBeenCalledOnce();
  });

  it("fails rather than accept without counting", async () => {
    vi.mocked(consumeRateLimit).mockRejectedValue(new Error("database down"));
    await expect(receive(form())).rejects.toThrow("database down");
    vi.stubEnv("IP_HASH_SECRET", "");
    await expect(receive(form())).rejects.toThrow(/IP_HASH_SECRET/);
  });
});

describe("receiveProposal: publication (HU-83)", () => {
  it("saves nothing when something fails before", async () => {
    cloudflareAnswers(false);
    await receive(form());
    cloudflareAnswers(true);
    await receive(form({ placeName: "" }));
    await receive(form({ placeType: "volcan" }));
    await receive(form({ municipality: "palmira" }));
    vi.mocked(findPossibleDuplicates).mockResolvedValueOnce([{ slug: "a", name: "A" }]);
    await receive(form());
    vi.mocked(consumeRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterS: 60,
      newWindow: false,
    });
    await receive(form());
    vi.mocked(locateInMunicipality).mockResolvedValue(null);
    await receive(form());
    expect(saveCommunityPlace).not.toHaveBeenCalled();
  });

  it("says whether the published site is fragile", async () => {
    await expect(receive(form({ fragile: "on" }))).resolves.toEqual({
      ...published,
      fragile: true,
    });
  });

  it("fails when saving fails, so the visitor can try again", async () => {
    vi.mocked(saveCommunityPlace).mockRejectedValue(new Error("database down"));
    await expect(receive(form())).rejects.toThrow("database down");
  });
});

describe("toNewCommunityPlace", () => {
  const values = {
    placeName: "Charco del Burro",
    placeType: "rio",
    activities: ["camping"],
    municipality: "cali",
    latitude: 3.45,
    longitude: -76.53,
    description: "Pozo de agua fría rodeado de bosque.",
    cost: null,
    fragile: false,
    acceptedTerms: true as const,
  };
  const located = { slug: "cali", municipalityId: 7, point: { lat: 3.4501, lon: -76.5301 } };

  it("uses the located municipality and point, not what was written", () => {
    expect(toNewCommunityPlace(values, located)).toEqual({
      name: "Charco del Burro",
      placeTypeSlug: "rio",
      activitySlugs: ["camping"],
      municipalitySlug: "cali",
      municipalityId: 7,
      location: { lat: 3.4501, lng: -76.5301 },
      description: "Pozo de agua fría rodeado de bosque.",
      cost: null,
      sensitivity: "normal",
      confidence: 30,
    });
  });

  it("marks a site as fragile when the visitor did", () => {
    expect(toNewCommunityPlace({ ...values, fragile: true }, located).sensitivity).toBe("fragile");
  });

  it("saves the cost in the database's values, and it adds confidence (docs/confianza.md)", () => {
    const free = toNewCommunityPlace({ ...values, cost: "gratis" }, located);
    expect(free.cost).toBe("free");
    expect(free.confidence).toBe(40);
    expect(toNewCommunityPlace({ ...values, cost: "pago" }, located).cost).toBe("paid");
  });
});

describe("limitMessage", () => {
  it("rounds the wait up to whole hours", () => {
    expect(limitMessage(60)).toContain("en 1 hora.");
    expect(limitMessage(3600)).toContain("en 1 hora.");
    expect(limitMessage(3601)).toContain("en 2 horas.");
  });

  it("says the limit is for the connection", () => {
    expect(limitMessage(60)).toContain("Desde tu conexión ya se enviaron las 5 propuestas");
  });
});

describe("catalogErrors", () => {
  it("has nothing to say about values in the lists, or about no activities", () => {
    expect(catalogErrors({ placeType: "rio", activities: ["camping"] }, catalogs)).toEqual({});
    expect(catalogErrors({ placeType: "rio", activities: [] }, catalogs)).toEqual({});
  });
});
