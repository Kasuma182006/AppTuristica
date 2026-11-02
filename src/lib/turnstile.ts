import { z } from "zod";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The hidden field where the widget leaves its token. */
export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response";

/** Cloudflare's limit: a longer text is not a token, so it is not worth asking. */
const MAX_TOKEN_LENGTH = 2048;

const VERIFY_TIMEOUT_MS = 5000;

const verifyResponseSchema = z.object({ success: z.boolean() });

/**
 * Whether Cloudflare accepts a Turnstile token (HU-79). Anything else counts as not verified:
 * a missing secret, or Cloudflare being down, because proposals are published without review.
 * The visitor's IP is optional for Cloudflare, so it is not sent.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return false;
  }
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    return verifyResponseSchema.parse(await response.json()).success;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
