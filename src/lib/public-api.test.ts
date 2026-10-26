import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitResult } from "./rate-limit";

const consumeRateLimit = vi.fn<(db: unknown, ipHash: string) => Promise<RateLimitResult>>();
const deleteExpiredRateLimits = vi.fn<() => Promise<void>>();
const afterCallbacks: (() => unknown)[] = [];

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: () => Promise.resolve(),
  after: (callback: () => unknown) => afterCallbacks.push(callback),
}));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("./rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./rate-limit")>()),
  consumeRateLimit: (db: unknown, ipHash: string) => consumeRateLimit(db, ipHash),
  deleteExpiredRateLimits: () => deleteExpiredRateLimits(),
}));

const { corsPreflight, publicApi } = await import("./public-api");
const { hashIp } = await import("./ip-hash");

const SECRET = "c".repeat(64);
const handler = vi.fn(async () => Response.json({ data: "ok" }));
const GET = publicApi(handler);
const get = (ip = "181.49.12.7") =>
  GET(new NextRequest("http://localhost/api/v1/places", { headers: { "x-real-ip": ip } }), {});

const allowed: RateLimitResult = { allowed: true, retryAfterS: 30, newWindow: false };

describe("publicApi", () => {
  beforeEach(() => {
    vi.stubEnv("IP_HASH_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    consumeRateLimit.mockReset();
    deleteExpiredRateLimits.mockReset();
    handler.mockClear();
    afterCallbacks.length = 0;
  });

  it("runs the handler while under the limit, adding CORS headers", async () => {
    consumeRateLimit.mockResolvedValueOnce(allowed);

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "ok" });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
  });

  it("counts the request by the keyed hash of the IP, never the IP", async () => {
    consumeRateLimit.mockResolvedValueOnce(allowed);

    await get("181.49.12.7");

    const [, ipHash] = consumeRateLimit.mock.calls[0] ?? [];
    expect(ipHash).toBe(hashIp("181.49.12.7", SECRET));
    expect(ipHash).not.toContain("181.49");
  });

  it("returns 429 with Retry-After and the API error format past the limit", async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterS: 23, newWindow: false });

    const response = await get();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("23");
    expect(response.headers.get("Access-Control-Expose-Headers")).toBe("Retry-After");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual({
      error: { code: "rate_limited", message: "Demasiadas peticiones. Intenta de nuevo en 23 s." },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("deletes expired counters after the response when a window starts", async () => {
    consumeRateLimit.mockResolvedValueOnce({ ...allowed, newWindow: true });
    deleteExpiredRateLimits.mockResolvedValueOnce();

    await get();
    expect(deleteExpiredRateLimits).not.toHaveBeenCalled();
    await Promise.all(afterCallbacks.map((callback) => callback()));

    expect(deleteExpiredRateLimits).toHaveBeenCalledOnce();
  });

  it("does not clean up on later requests of the window", async () => {
    consumeRateLimit.mockResolvedValueOnce(allowed);

    await get();

    expect(afterCallbacks).toHaveLength(0);
  });

  it("lets the request through when the counter fails, logging the error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    consumeRateLimit.mockRejectedValueOnce(new Error("connection refused"));

    const response = await get();

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalled();
  });

  it("lets the request through when IP_HASH_SECRET is missing, logging the error", async () => {
    vi.stubEnv("IP_HASH_SECRET", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await get();

    expect(response.status).toBe(200);
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });
});

describe("corsPreflight", () => {
  it("answers 204 with the CORS headers", () => {
    const response = corsPreflight();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
