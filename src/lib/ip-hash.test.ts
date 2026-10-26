import { describe, expect, it } from "vitest";
import { clientIp, hashIp } from "./ip-hash";

const secret = "a".repeat(64);

describe("hashIp", () => {
  it("returns a 64-character hex HMAC, never the IP", () => {
    const hash = hashIp("181.49.12.7", secret);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("181.49");
  });

  it("is stable for the same IP and secret", () => {
    expect(hashIp("181.49.12.7", secret)).toBe(hashIp("181.49.12.7", secret));
  });

  it("differs between IPs and between secrets", () => {
    expect(hashIp("181.49.12.7", secret)).not.toBe(hashIp("181.49.12.8", secret));
    expect(hashIp("181.49.12.7", secret)).not.toBe(hashIp("181.49.12.7", "b".repeat(64)));
  });

  it.each([undefined, "", "short-secret"])("refuses a missing or short secret (%j)", (value) => {
    expect(() => hashIp("181.49.12.7", value)).toThrow(/IP_HASH_SECRET/);
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "181.49.12.7", "x-forwarded-for": "10.0.0.1" });

    expect(clientIp(headers)).toBe("181.49.12.7");
  });

  it("falls back to the first x-forwarded-for address", () => {
    const headers = new Headers({ "x-forwarded-for": " 2800:e2:1::5 , 10.0.0.1" });

    expect(clientIp(headers)).toBe("2800:e2:1::5");
  });

  it('returns "unknown" without either header', () => {
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": " " }))).toBe("unknown");
  });
});
