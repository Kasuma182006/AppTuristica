import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile";
import { receiveProposal } from "./service";

const fetchMock = vi.fn<typeof fetch>();

const form = (token?: string | File) => {
  const data = new FormData();
  if (token !== undefined) data.set(TURNSTILE_TOKEN_FIELD, token);
  return data;
};

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("receiveProposal", () => {
  it("receives a proposal with a token Cloudflare accepts", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    await expect(receiveProposal(form("token"))).resolves.toEqual({ status: "received" });
  });

  it("rejects a token Cloudflare rejects", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })));
    await expect(receiveProposal(form("token"))).resolves.toEqual({ status: "not-verified" });
  });

  it("rejects a proposal without a token, or with a file in its place", async () => {
    await expect(receiveProposal(form())).resolves.toEqual({ status: "not-verified" });
    await expect(receiveProposal(form(new File(["x"], "token.txt")))).resolves.toEqual({
      status: "not-verified",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
