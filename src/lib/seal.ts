/**
 * Signing the session cookie (6 Nov).
 *
 * `OPS_SESSION_SECRET` has been in `.env.example` since the beginning, written
 * by both start scripts, and **read by nothing**. The development cookie held
 * a plain member id, so anybody who could set a cookie could be anybody. That
 * did not matter while the data was invented. It matters now.
 *
 * So: value, a dot, and an HMAC of the value. Not a JWT - there is nothing to
 * interoperate with, and a format nobody has to look up is better than one
 * that needs a library.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function secretFrom(env: Record<string, string | undefined>): string | null {
  const found = (env.OPS_SESSION_SECRET ?? "").trim();
  // Short enough to guess is the same as none at all, and silently accepting
  // one is how a system ends up with a secret of "x".
  return found.length >= 16 ? found : null;
}

function signatureOf(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function seal(value: string, secret: string): string {
  return value + "." + signatureOf(value, secret);
}

/** The value back, or nothing at all. Never a half-trusted answer. */
export function unseal(token: string, secret: string): string | null {
  const at = (token ?? "").lastIndexOf(".");
  if (at <= 0) return null;
  const value = token.slice(0, at);
  const given = Buffer.from(token.slice(at + 1));
  const wanted = Buffer.from(signatureOf(value, secret));
  // Compared in constant time: a comparison that stops at the first wrong
  // character tells somebody how far they got.
  if (given.length !== wanted.length) return null;
  return timingSafeEqual(given, wanted) ? value : null;
}
