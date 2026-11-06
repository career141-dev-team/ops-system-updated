/**
 * Real sign-in (6 Nov).
 *
 * Until today there was none: you picked a name from a list. The parts that
 * decide anything are pure, so they are tested here rather than by clicking
 * through Microsoft - the URL we send somebody to, what has to be true of the
 * token that comes back, and who is allowed in once it is.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { seal, secretFrom, unseal } from "@/lib/seal";
import {
  authorizeUrl,
  claimsOf,
  emailOf,
  pkce,
  problemWithClaims,
  signInConfigFrom,
  tokenRequestBody,
  whoMayIn,
  type Claims,
} from "@/lib/signIn";

const TENANT = "11111111-2222-3333-4444-555555555555";
const CFG = {
  tenant: TENANT,
  clientId: "app-id",
  clientSecret: "shhh",
  redirectUri: "https://ops.example.test/sign-in/microsoft/back",
};
const NOW = Date.UTC(2026, 10, 6, 9, 0);

const token = (claims: Claims) =>
  "header." + Buffer.from(JSON.stringify(claims), "utf8").toString("base64url") + ".signature";

const good = (over: Partial<Claims> = {}): Claims => ({
  aud: "app-id",
  tid: TENANT,
  iss: "https://login.microsoftonline.com/" + TENANT + "/v2.0",
  nonce: "n-1",
  exp: Math.floor(NOW / 1000) + 3600,
  email: "Rushda@career141.com",
  ...over,
});

const checked = (claims: Claims | null, nonce = "n-1") =>
  problemWithClaims(claims, { clientId: "app-id", tenant: TENANT, nonce, now: NOW });

/* ── Is it set up at all ─────────────────────────────────────────── */

test("sign-in is set up only when every part of it is", () => {
  const full = {
    MS_TENANT_ID: TENANT,
    MS_CLIENT_ID: "app-id",
    MS_CLIENT_SECRET: "shhh",
    OPS_APP_URL: "https://ops.example.test",
  };
  assert.notEqual(signInConfigFrom(full), null);

  // Three quarters of a door is not a door.
  for (const missing of ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "OPS_APP_URL"]) {
    assert.equal(signInConfigFrom({ ...full, [missing]: "" }), null, missing + " alone should switch it off");
  }
});

test("where Microsoft sends a person back is built from the app's own address", () => {
  const cfg = signInConfigFrom({
    MS_TENANT_ID: TENANT,
    MS_CLIENT_ID: "app-id",
    MS_CLIENT_SECRET: "shhh",
    // A trailing slash is how a person writes an address, and it must not
    // produce a redirect that Microsoft refuses for not matching exactly.
    OPS_APP_URL: "https://ops.example.test/",
  });
  assert.equal(cfg?.redirectUri, "https://ops.example.test/sign-in/microsoft/back");
});

/* ── Going there ─────────────────────────────────────────────────── */

test("the authorize URL asks for a sign-in and nothing more", () => {
  const url = new URL(authorizeUrl(CFG, { state: "s-1", nonce: "n-1", challenge: "c-1" }));
  assert.equal(url.origin + url.pathname, "https://login.microsoftonline.com/" + TENANT + "/oauth2/v2.0/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), CFG.redirectUri);
  assert.equal(url.searchParams.get("state"), "s-1");
  assert.equal(url.searchParams.get("nonce"), "n-1");
  assert.equal(url.searchParams.get("code_challenge"), "c-1");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  // A door, not a reason to read their mail.
  assert.equal(url.searchParams.get("scope"), "openid profile email");
});

test("the PKCE pair is fresh every time and the challenge is the hash, not the secret", () => {
  const a = pkce();
  const b = pkce();
  assert.notEqual(a.verifier, b.verifier, "two sign-ins never share a verifier");
  assert.notEqual(a.verifier, a.challenge, "sending the verifier would defeat the point");
  assert.match(a.challenge, /^[A-Za-z0-9_-]+$/, "base64url, so it survives a query string");
});

test("the secret is sent to Microsoft and never put in a URL", () => {
  const body = tokenRequestBody(CFG, "the-code", "the-verifier");
  const sent = new URLSearchParams(body);
  assert.equal(sent.get("grant_type"), "authorization_code");
  assert.equal(sent.get("code"), "the-code");
  assert.equal(sent.get("code_verifier"), "the-verifier");
  assert.equal(sent.get("client_secret"), "shhh");
  assert.ok(!authorizeUrl(CFG, { state: "s", nonce: "n", challenge: "c" }).includes("shhh"));
});

/* ── Coming back ─────────────────────────────────────────────────── */

test("a token that is not a token is refused rather than half-read", () => {
  assert.equal(claimsOf(""), null);
  assert.equal(claimsOf("one.two"), null, "a JWT has three parts");
  assert.equal(claimsOf("a." + Buffer.from("not json").toString("base64url") + ".c"), null);
  assert.equal(claimsOf("a." + Buffer.from("[1,2]").toString("base64url") + ".c"), null, "a list is not a set of claims");
  assert.match(checked(null) ?? "", /not a sign-in token/);
});

test("the ordinary case: a real token from our own tenant is let through", () => {
  assert.equal(checked(claimsOf(token(good()))), null);
});

test("every way a token can be wrong is refused, in words", () => {
  // Issued for somebody else's application.
  assert.match(checked(good({ aud: "another-app" })) ?? "", /different application/);
  // Another organisation's token, correctly signed by Microsoft for them.
  assert.match(checked(good({ tid: "99999999-2222-3333-4444-555555555555",
    iss: "https://login.microsoftonline.com/99999999-2222-3333-4444-555555555555/v2.0" })) ?? "",
    /different organisation/);
  // The issuer and the organisation disagreeing is the interesting attack.
  assert.match(checked(good({ iss: "https://login.microsoftonline.com/someone-else/v2.0" })) ?? "", /does not come from Microsoft/);
  assert.match(checked(good({ iss: "https://evil.test/" + TENANT + "/v2.0" })) ?? "", /does not come from Microsoft/);
  assert.match(checked(good({ tid: "" })) ?? "", /which organisation/);
  // Replayed from another attempt, or from somebody else's.
  assert.match(checked(good({ nonce: "somebody-elses" })) ?? "", /does not belong to this attempt/);
  assert.match(checked(good({ nonce: undefined })) ?? "", /does not belong to this attempt/);
  // Old.
  assert.match(checked(good({ exp: Math.floor(NOW / 1000) - 3600 })) ?? "", /expired/);
  assert.match(checked(good({ exp: undefined })) ?? "", /expired/);
});

test("a clock a few minutes out is tolerated; an hour is not", () => {
  const secondsNow = Math.floor(NOW / 1000);
  // Expired one minute ago on their clock: let in, because ours may be fast.
  assert.equal(checked(good({ exp: secondsNow - 60 })), null);
  assert.match(checked(good({ exp: secondsNow - 3600 })) ?? "", /expired/);
  // Not valid for another minute, for the same reason the other way round.
  assert.equal(checked(good({ nbf: secondsNow + 60 })), null);
  assert.match(checked(good({ nbf: secondsNow + 3600 })) ?? "", /clock is wrong/);
});

test("a tenant written as a domain still works, because Microsoft resolves it", () => {
  const problem = problemWithClaims(good(), {
    clientId: "app-id",
    tenant: "career141.com",
    nonce: "n-1",
    now: NOW,
  });
  assert.equal(problem, null, "there is no id to compare with, and the issuer still proves the rest");
});

test("the address is found wherever Microsoft put it, and lower-cased", () => {
  assert.equal(emailOf({ email: "A@B.test" }), "a@b.test");
  assert.equal(emailOf({ preferred_username: "c@d.test" }), "c@d.test");
  assert.equal(emailOf({ upn: "e@f.test" }), "e@f.test");
  // A preferred_username is not always an address; a thing with no @ is not one.
  assert.equal(emailOf({ preferred_username: "rushda" }), null);
  assert.equal(emailOf(null), null);
});

/* ── Who may come in ─────────────────────────────────────────────── */

test("the ops team is the allow-list, and a real Microsoft account is not a pass", () => {
  const members = [
    { id: "m_1", email: "rushda@career141.com", active: true },
    { id: "m_2", email: "gone@career141.com", active: false },
  ];
  assert.deepEqual(whoMayIn("rushda@career141.com", members), { ok: true, memberId: "m_1" });
  // Everybody in the company has a Microsoft account. They do not all work here.
  const stranger = whoMayIn("someone@career141.com", members);
  assert.equal(stranger.ok, false);
  assert.match(stranger.ok === false ? stranger.why : "", /not on the ops team/);
  // Taken off the team: refused, and told which of the two it is.
  const left = whoMayIn("gone@career141.com", members);
  assert.equal(left.ok, false);
  assert.match(left.ok === false ? left.why : "", /marked as having left/);
  // No address at all.
  assert.equal(whoMayIn(null, members).ok, false);
});

test("the address is matched however it was typed into the People screen", () => {
  const members = [{ id: "m_1", email: "  Rushda@Career141.com ", active: true }];
  assert.deepEqual(whoMayIn(emailOf(good()), members), { ok: true, memberId: "m_1" });
});

/* ── The cookie ──────────────────────────────────────────────────── */

test("a session cookie somebody wrote themselves is not a session", () => {
  const secret = "a-long-enough-secret-value";
  const mine = seal("m_1", secret);
  assert.equal(unseal(mine, secret), "m_1");

  // The whole point: the id alone, which is what the old cookie held.
  assert.equal(unseal("m_1", secret), null);
  assert.equal(unseal("m_2." + mine.split(".")[1], secret), null, "the id swapped under a real signature");
  assert.equal(unseal(mine, "a-different-long-secret"), null, "another machine's secret");
  assert.equal(unseal("", secret), null);
  assert.equal(unseal(".abc", secret), null, "no value at all");

  // A signature of the right shape but the wrong content.
  const forged = "m_9." + createHmac("sha256", "guessed").update("m_9").digest("base64url");
  assert.equal(unseal(forged, secret), null);
});

test("a secret short enough to guess counts as none at all", () => {
  assert.equal(secretFrom({ OPS_SESSION_SECRET: "x" }), null);
  assert.equal(secretFrom({ OPS_SESSION_SECRET: "   " }), null);
  assert.equal(secretFrom({}), null);
  assert.equal(
    secretFrom({ OPS_SESSION_SECRET: "sixteen-exactly!" }),
    "sixteen-exactly!",
  );
});
