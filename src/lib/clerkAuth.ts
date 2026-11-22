/**
 * Pure Clerk authentication and allow-list rules (20 Nov).
 *
 * Kept pure (no network, no Clerk SDK imports) so every branch is unit-testable
 * under `node tests/run.mjs`.
 */

export type ClerkDoor =
  | { ok: true; memberId: string; provisionAdmin?: false }
  | { ok: true; provisionAdmin: true; email: string }
  | { ok: false; why: string };

/** True when both Clerk keys are present. Never allows dev sign-in alongside Clerk. */
export function clerkConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean((env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim() && (env.CLERK_SECRET_KEY ?? "").trim());
}

/** Parses comma/semicolon-separated developer/higher-up emails allowed to auto-provision as Admin. */
export function adminEmailsFrom(env: Record<string, string | undefined>): Set<string> {
  const raw = (env.OPS_ADMIN_EMAILS ?? "").trim();
  const out = new Set<string>();
  if (!raw) return out;
  for (const part of raw.split(/[,;\n]/)) {
    const email = part.trim().toLowerCase();
    if (email.includes("@")) out.add(email);
  }
  return out;
}

/**
 * Decides whether a Clerk-authenticated email may enter Ops.
 *
 * A Clerk account proves identity; `opsMembers` (or `OPS_ADMIN_EMAILS` for
 * developer/higher-up bootstrap) proves authorization and role.
 */
export function resolveClerkDoor(
  email: string | null | undefined,
  members: { id: string; email: string; active: boolean }[],
  adminEmails: Set<string>,
): ClerkDoor {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, why: "Clerk did not return a verified email address for your account." };
  }
  const match = members.find((m) => m.email.trim().toLowerCase() === normalized);
  if (match) {
    if (!match.active) {
      return {
        ok: false,
        why: `${normalized} is marked as inactive. Ask an Ops lead or Admin to reactivate your account.`,
      };
    }
    return { ok: true, memberId: match.id };
  }
  if (adminEmails.has(normalized)) {
    return { ok: true, provisionAdmin: true, email: normalized };
  }
  return {
    ok: false,
    why: `${normalized} is not on the Ops team yet. Ask an Ops lead or Admin to add your email in Settings → Templates and people.`,
  };
}
