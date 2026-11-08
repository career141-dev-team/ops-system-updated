/**
 * Who is signed in.
 *
 * Two doors, and only ever one of them open on a given machine:
 *
 *   **Microsoft** (`signIn.ts`), as soon as the tenant, the application and
 *   `OPS_APP_URL` are set. The cookie holds the member id, signed, so a cookie
 *   somebody wrote themselves is not a session.
 *   **Pick your name**, development only, refused unless `OPS_DEV_SIGNIN` says
 *   on. It is how the laptop and the invented-data preview work.
 *
 * Both end in the same place: a member, or nothing. The rest of the app - all
 * forty-eight pages of it - only ever receives a member and never asks which
 * door they came through, which is what made replacing the development one a
 * change to this file rather than to the app (6 Nov).
 */

import { cookies } from "next/headers";

import { desk, member as findMember } from "@/data/desk";
import type { OpsMember } from "@/data/types";
import { seal, secretFrom, unseal } from "./seal";
import { signInConfigFrom } from "./signIn";

/** The real one. Signed, and kept apart from the development cookie by name. */
const REAL = "ops_session";
const DEV = "ops_dev_member";

/** A working day is long; a week is not a session. */
const SESSION_DAYS = 7;

export function microsoftSignInConfigured(): boolean {
  return signInConfigFrom(process.env) !== null && secretFrom(process.env) !== null;
}

export function devSignInAllowed(): boolean {
  // Never both. A machine with a real door does not keep a second one that
  // needs no password, however the environment is written.
  if (microsoftSignInConfigured()) return false;
  return (process.env.OPS_DEV_SIGNIN ?? "").toLowerCase() === "on";
}

/**
 * Why nobody can sign in, when nobody can.
 *
 * Said on the sign-in screen. "Not set up yet" taught the reader nothing,
 * which is the complaint this whole UI pass started from.
 */
export function signInOffReason(): string | null {
  if (microsoftSignInConfigured() || devSignInAllowed()) return null;
  if (signInConfigFrom(process.env) && !secretFrom(process.env)) {
    return "Microsoft sign-in is set up, but OPS_SESSION_SECRET is missing or shorter than 16 characters, so a session could not be kept safely.";
  }
  return "Sign-in is not set up on this machine. Either set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, OPS_APP_URL and OPS_SESSION_SECRET for Microsoft sign-in, or OPS_DEV_SIGNIN=on for the development one.";
}

async function memberIdFromCookie(): Promise<string | null> {
  const jar = await cookies();

  const secret = secretFrom(process.env);
  const sealed = jar.get(REAL)?.value;
  if (secret && sealed) {
    const opened = unseal(sealed, secret);
    if (opened) return opened;
  }

  if (devSignInAllowed()) return jar.get(DEV)?.value ?? null;
  return null;
}

export async function currentMember(): Promise<OpsMember | null> {
  const chosen = await memberIdFromCookie();
  if (!chosen) return null;
  const found = findMember(await desk(), chosen);
  // Taken off the team mid-session, and the next page they open says so.
  return found && found.active ? found : null;
}

/** The real door. Only the Microsoft route reaches this. */
export async function startSession(memberId: string): Promise<void> {
  const secret = secretFrom(process.env);
  if (!secret) throw new Error("OPS_SESSION_SECRET is not set, so a session cannot be signed.");
  const jar = await cookies();
  jar.set(REAL, seal(memberId, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.OPS_APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** The development door. Refused outright when it is not allowed. */
export async function signInAs(memberId: string): Promise<void> {
  if (!devSignInAllowed()) throw new Error("Development sign-in is switched off.");
  const jar = await cookies();
  // Kept as long as the real one (8 Nov). Without a maxAge it was a session
  // cookie, and the browser pane the walks run in drops those when it is
  // hidden for a while - every long walk ended on /sign-in with nothing of
  // ours having signed anybody out, and an hour went on the wrong suspect.
  jar.set(DEV, memberId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 24 * 60 * 60 });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(REAL);
  jar.delete(DEV);
}
