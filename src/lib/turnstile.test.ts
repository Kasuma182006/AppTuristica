import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const fetchMock = vi.fn<typeof fetch>();

const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("verifyTurnstile", () => {
  it("accepts a token Cloudflare accepts, sending only the secret and the token", async () => {
    answer({ success: true });

    await expect(verifyTurnstile("token")).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      secret: "secret",
      response: "token",
    });
  });

  it("rejects a token Cloudflare rejects", async () => {
    answer({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(verifyTurnstile("token")).resolves.toBe(false);
  });

  it.each([
    ["an empty token", ""],
    ["a token too long", "a".repeat(2049)],
  ])("rejects %s without asking Cloudflare", async (_, token) => {
    await expect(verifyTurnstile(token)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when the secret is not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    await expect(verifyTurnstile("token")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when Cloudflare cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(verifyTurnstile("token")).resolves.toBe(false);
  });

  it("rejects when Cloudflare answers with an error page", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(verifyTurnstile("token")).resolves.toBe(false);
  });

  it("rejects an answer without the expected shape", async () => {
    answer({ ok: true });
    await expect(verifyTurnstile("token")).resolves.toBe(false);
  });
});
