import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashIp } from "@/lib/ip-hash";
import { TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile";
import { saveReport } from "./repository";
import { REPORT_PLACE_FIELD } from "./schemas";
import { receiveReport } from "./service";

vi.mock("./repository", () => ({ saveReport: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));

const fetchMock = vi.fn<typeof fetch>();

const SECRET = "a".repeat(64);
const IP = "203.0.113.7";
const visitor = new Headers({ "x-real-ip": IP });

const form = (fields: Record<string, string> = {}) => {
  const data = new FormData();
  const all = {
    [TURNSTILE_TOKEN_FIELD]: "token",
    [REPORT_PLACE_FIELD]: "embalse-de-calima",
    reason: "dangerous",
    comment: "Hay un derrumbe.",
    ...fields,
  };
  for (const [name, value] of Object.entries(all)) data.set(name, value);
  return data;
};

const cloudflareSays = (success: boolean) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ success })));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubEnv("IP_HASH_SECRET", SECRET);
  vi.mocked(saveReport).mockResolvedValue(true);
  cloudflareSays(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("receiveReport", () => {
  it("saves the report with only the hash of the IP", async () => {
    await expect(receiveReport(form(), visitor)).resolves.toEqual({ status: "received" });

    expect(saveReport).toHaveBeenCalledWith(
      {},
      {
        placeSlug: "embalse-de-calima",
        reason: "dangerous",
        comment: "Hay un derrumbe.",
        ipHash: hashIp(IP, SECRET),
      },
    );
    expect(JSON.stringify(vi.mocked(saveReport).mock.calls)).not.toContain(IP);
  });

  it("saves no comment when none was written", async () => {
    await receiveReport(form({ comment: "  " }), visitor);

    expect(vi.mocked(saveReport).mock.calls[0]?.[1].comment).toBeNull();
  });

  it("saves nothing if Cloudflare does not confirm the visitor", async () => {
    cloudflareSays(false);

    await expect(receiveReport(form(), visitor)).resolves.toEqual({ status: "not-verified" });
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("saves nothing without a token, and does not ask Cloudflare", async () => {
    const data = form();
    data.delete(TURNSTILE_TOKEN_FIELD);

    await expect(receiveReport(data, visitor)).resolves.toEqual({ status: "not-verified" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("checks the token before anything else", async () => {
    cloudflareSays(false);

    await expect(receiveReport(form({ reason: "spam" }), visitor)).resolves.toEqual({
      status: "not-verified",
    });
  });

  it("returns what to fix, saving nothing", async () => {
    await expect(receiveReport(form({ reason: "spam" }), visitor)).resolves.toEqual({
      status: "invalid",
      errors: { reason: "Elige un motivo." },
    });
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("does not look up an address that cannot exist", async () => {
    await expect(
      receiveReport(form({ [REPORT_PLACE_FIELD]: "NOT A SLUG" }), visitor),
    ).resolves.toEqual({ status: "not-found" });
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("says so when the site is hidden or gone", async () => {
    vi.mocked(saveReport).mockResolvedValue(false);

    await expect(receiveReport(form(), visitor)).resolves.toEqual({ status: "not-found" });
  });
});
