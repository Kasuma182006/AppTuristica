import { createHmac } from "node:crypto";

/** Hex characters of the secret: 32 random bytes, e.g. `openssl rand -hex 32`. */
const MIN_SECRET_LENGTH = 64;

/**
 * Keyed hash of an IP (HMAC-SHA256, hex), the only form in which an IP is stored (RNF-05).
 * Without the key a hash cannot be reversed by trying every IPv4 address.
 */
export function hashIp(ip: string, secret = process.env.IP_HASH_SECRET): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `IP_HASH_SECRET must have at least ${MIN_SECRET_LENGTH} characters (see .env.example)`,
    );
  }
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/**
 * The client's IP as reported by Vercel, which sets these headers itself (a client cannot spoof
 * them). "unknown" when absent, e.g. in local development.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
