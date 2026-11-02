/**
 * Who is signed in, while we are building (2 Nov).
 *
 * Development sign-in only: you pick a name, and the choice is kept in a cookie.
 * It unlocks nothing real, it is refused unless OPS_DEV_SIGNIN is on, and the
 * preview it runs on holds invented data only. Real Clerk sign-in replaces this
 * before any real client data exists, and the rest of the app does not change,
 * because everything downstream only ever receives a member.
 */

import { cookies } from "next/headers";

import { desk, member as findMember } from "@/data/desk";
import type { OpsMember } from "@/data/types";

const COOKIE = "ops_dev_member";

export function devSignInAllowed(): boolean {
  return (process.env.OPS_DEV_SIGNIN ?? "").toLowerCase() === "on";
}

export async function currentMember(): Promise<OpsMember | null> {
  if (!devSignInAllowed()) return null;
  const jar = await cookies();
  const chosen = jar.get(COOKIE)?.value;
  if (!chosen) return null;
  const found = findMember(await desk(), chosen);
  return found && found.active ? found : null;
}

export async function signInAs(memberId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, memberId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
