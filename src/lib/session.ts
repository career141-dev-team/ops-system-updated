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
import { cache } from "react";

import { addMember, desk, member as findMember } from "@/data/desk";
import type { OpsMember } from "@/data/types";
import { adminEmailsFrom, clerkConfigured, resolveClerkDoor } from "./clerkAuth";
import { previewRoleFrom } from "./roles";
import { seal, secretFrom, unseal } from "./seal";
import { signInConfigFrom } from "./signIn";

/** The real one. Signed, and kept apart from the development cookie by name. */
const REAL = "ops_session";
const DEV = "ops_dev_member";
/** "View as": the role being previewed. Never trusted; see `previewRoleFrom`. */
export const VIEW_AS = "ops_view_as";

/** A working day is long; a week is not a session. */
const SESSION_DAYS = 7;

export function clerkSignInConfigured(): boolean {
  return clerkConfigured(process.env);
}

export function microsoftSignInConfigured(): boolean {
  if (clerkSignInConfigured()) return false;
  return signInConfigFrom(process.env) !== null && secretFrom(process.env) !== null;
}

export function devSignInAllowed(): boolean {
  // Never both. A machine with a real door does not keep a second one that
  // needs no password, however the environment is written.
  if (clerkSignInConfigured() || microsoftSignInConfigured()) return false;
  return (process.env.OPS_DEV_SIGNIN ?? "").toLowerCase() === "on";
}

/**
 * Why nobody can sign in, when nobody can.
 *
 * Said on the sign-in screen. "Not set up yet" taught the reader nothing,
 * which is the complaint this whole UI pass started from.
 */
export function signInOffReason(): string | null {
  if (clerkSignInConfigured() || microsoftSignInConfigured() || devSignInAllowed()) return null;
  if (signInConfigFrom(process.env) && !secretFrom(process.env)) {
    return "Microsoft sign-in is set up, but OPS_SESSION_SECRET is missing or shorter than 16 characters, so a session could not be kept safely.";
  }
  return "Sign-in is not set up on this machine. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for Clerk sign-in, Microsoft sign-in keys, or OPS_DEV_SIGNIN=on for development.";
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

/**
 * Resolves the current Clerk session (when Clerk is configured) against the Ops allow-list.
 * Returns whether the user is signed into Clerk, their matched/provisioned OpsMember, or a refusal message.
 */
// cache(): the layout and the page both ask, and each ask is a network call to Clerk.
export const clerkSessionState = cache(async (): Promise<{
  signedIn: boolean;
  member: OpsMember | null;
  problem: string | null;
}> => {
  if (!clerkSignInConfigured()) return { signedIn: false, member: null, problem: null };
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return { signedIn: false, member: null, problem: null };

  let user;
  try {
    user = await currentUser();
  } catch {
    // 23 Nov: Clerk unreachable ("fetch failed") crashed every page; say so instead.
    return { signedIn: true, member: null, problem: "Could not reach Clerk to check your account. Check the internet connection and reload." };
  }
  const primary =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  const db = await desk();
  const door = resolveClerkDoor(primary, db.members, adminEmailsFrom(process.env));
  if (!door.ok) return { signedIn: true, member: null, problem: door.why };

  if (door.provisionAdmin) {
    const displayName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      door.email.split("@")[0] ||
      "Admin";
    const created = await addMember(
      {
        name: displayName,
        email: door.email,
        role: "admin",
        active: true,
        taUserId: null,
      },
      "system",
    );
    return { signedIn: true, member: created, problem: null };
  }

  const found = findMember(db, door.memberId);
  return { signedIn: true, member: found && found.active ? found : null, problem: null };
});

/** The person who signed in, whatever role they are previewing. */
export async function realMember(): Promise<OpsMember | null> {
  if (clerkSignInConfigured()) {
    const state = await clerkSessionState();
    return state.member;
  }
  const chosen = await memberIdFromCookie();
  if (!chosen) return null;
  const found = findMember(await desk(), chosen);
  // Taken off the team mid-session, and the next page they open says so.
  return found && found.active ? found : null;
}

/**
 * Who the app treats you as: you, or you looking through a lesser role's eyes (16 Nov).
 * Only the role changes - the id stays yours, so what you do is still recorded as you.
 */
export async function currentMember(): Promise<OpsMember | null> {
  const real = await realMember();
  if (!real) return null;
  const as = previewRoleFrom(real.role, (await cookies()).get(VIEW_AS)?.value);
  return as ? { ...real, role: as } : real;
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
  welcome(jar);
}

/** A thirty-second note, readable by the page, that somebody has just signed in: it plays the welcome once. */
function welcome(jar: Awaited<ReturnType<typeof cookies>>): void {
  jar.set("ops_welcome", "1", { sameSite: "lax", path: "/", maxAge: 30 });
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
  welcome(jar);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(REAL);
  jar.delete(DEV);
  jar.delete(VIEW_AS);
}
