/**
 * Real sign-in: Microsoft, the account everybody already has (6 Nov).
 *
 * Until today there was none. `session.ts` let you pick a name from a list,
 * and its own comment said real sign-in had to replace it "before any real
 * client data exists" - which is exactly the thing docs/26 is about, so it is
 * first. The owner's two choices were Clerk and Microsoft; Microsoft wins
 * because we are already asking the same admin for Graph mail permissions, so
 * it is one conversation instead of two, and because an ops person who leaves
 * the company loses this the moment their Microsoft account is disabled.
 *
 * The flow is the ordinary authorization code flow with PKCE, and the rules
 * that decide whether somebody is let in live here, apart from the plumbing,
 * so they can be tested without a network:
 *
 *   - the authorize URL we send a person to, and the PKCE pair;
 *   - what has to be true of the token that comes back;
 *   - who the token says they are;
 *   - and whether that person may come in at all.
 *
 * **Why no signature check.** The token is fetched by us, over TLS, straight
 * from Microsoft's token endpoint, with our client secret. Nothing untrusted
 * carries it, so the channel is what proves where it came from - the position
 * OpenID Connect takes for a confidential client using the code flow. A token
 * that arrived any other way would need its signature checked, and none does.
 */

import { createHash, randomBytes } from "node:crypto";

export interface SignInConfig {
  tenant: string;
  clientId: string;
  clientSecret: string;
  /** Where Microsoft sends the person back. Must match the registration exactly. */
  redirectUri: string;
}

/** The claims we read. Microsoft sends many more; these are the ones that decide anything. */
export interface Claims {
  iss?: string;
  aud?: string;
  tid?: string;
  nonce?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
}

const MICROSOFT = "https://login.microsoftonline.com/";

/** A clock is never exactly right on two machines. Microsoft's own allowance. */
const SKEW_SECONDS = 300;

export function signInConfigFrom(env: Record<string, string | undefined>): SignInConfig | null {
  const tenant = (env.MS_TENANT_ID ?? "").trim();
  const clientId = (env.MS_CLIENT_ID ?? "").trim();
  const clientSecret = (env.MS_CLIENT_SECRET ?? "").trim();
  const redirectUri = (env.OPS_APP_URL ?? "").trim().replace(/\/+$/, "") + "/sign-in/microsoft/back";
  if (!tenant || !clientId || !clientSecret || !(env.OPS_APP_URL ?? "").trim()) return null;
  return { tenant, clientId, clientSecret, redirectUri };
}

/**
 * The pair that proves the code came back to the same browser that asked.
 *
 * We are a confidential client and already hold a secret, so this is belt and
 * braces - and it costs four lines.
 */
export function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function authorizeUrl(
  cfg: SignInConfig,
  one: { state: string; nonce: string; challenge: string },
): string {
  const url = new URL(MICROSOFT + encodeURIComponent(cfg.tenant) + "/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("response_mode", "query");
  // openid and profile name them; email carries the address we match on. We
  // ask for nothing else: this is a door, not a reason to read their mail.
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", one.state);
  url.searchParams.set("nonce", one.nonce);
  url.searchParams.set("code_challenge", one.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function tokenUrl(cfg: SignInConfig): string {
  return MICROSOFT + encodeURIComponent(cfg.tenant) + "/oauth2/v2.0/token";
}

/** The body of the exchange. Kept here so a test can read it without sending it. */
export function tokenRequestBody(cfg: SignInConfig, code: string, verifier: string): string {
  return new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  }).toString();
}

/** The middle part of a JWT, which is plain JSON. Nothing is trusted yet. */
export function claimsOf(idToken: string): Claims | null {
  const parts = (idToken ?? "").split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Claims;
  } catch {
    return null;
  }
}

/**
 * What has to be true of the token, in the order a person would check it.
 *
 * Every refusal is a sentence rather than a code, because the one place this
 * shows is a screen somebody is standing in front of.
 */
export function problemWithClaims(
  claims: Claims | null,
  expect: { clientId: string; tenant: string; nonce: string; now: number },
): string | null {
  if (!claims) return "Microsoft sent something that is not a sign-in token.";

  if (claims.aud !== expect.clientId) {
    return "That token was issued for a different application.";
  }

  const tid = (claims.tid ?? "").trim();
  if (!tid) return "The token does not say which organisation it came from.";
  if (claims.iss !== MICROSOFT + tid + "/v2.0") {
    return "The token does not come from Microsoft, or names an organisation it was not issued by.";
  }

  // A tenant written as a domain is resolved by Microsoft, and the token comes
  // back with the id. Only compare when we were given an id to compare with.
  const wanted = expect.tenant.trim().toLowerCase();
  if (/^[0-9a-f-]{36}$/.test(wanted) && tid.toLowerCase() !== wanted) {
    return "That account belongs to a different organisation.";
  }

  // The nonce is what stops a token from somewhere else being replayed here.
  if (!claims.nonce || claims.nonce !== expect.nonce) {
    return "That sign-in does not belong to this attempt. Start again.";
  }

  const seconds = Math.floor(expect.now / 1000);
  if (typeof claims.exp !== "number" || seconds > claims.exp + SKEW_SECONDS) {
    return "That sign-in has expired. Start again.";
  }
  if (typeof claims.nbf === "number" && seconds + SKEW_SECONDS < claims.nbf) {
    return "That sign-in is not valid yet, which usually means a clock is wrong.";
  }

  return null;
}

/** Microsoft puts the address in one of three places depending on the account. */
export function emailOf(claims: Claims | null): string | null {
  const found = claims?.email ?? claims?.preferred_username ?? claims?.upn ?? "";
  const trimmed = found.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

export type Door =
  | { ok: true; memberId: string }
  | { ok: false; why: string };

/**
 * Who may come in: somebody on the ops team, and nobody else.
 *
 * The member list is the allow-list. A real Microsoft account proves who
 * somebody is; it does not say they work on this desk, and the whole company
 * has one. Somebody taken off the team stops being able to sign in without
 * anybody touching Microsoft.
 */
export function whoMayIn(email: string | null, members: { id: string; email: string; active: boolean }[]): Door {
  if (!email) return { ok: false, why: "Microsoft did not tell us your email address." };
  const match = members.find((one) => one.email.trim().toLowerCase() === email);
  if (!match) {
    return {
      ok: false,
      why: email + " is not on the ops team. Ask the ops lead to add you on the People screen first.",
    };
  }
  if (!match.active) {
    return { ok: false, why: email + " is on the team but marked as having left." };
  }
  return { ok: true, memberId: match.id };
}
