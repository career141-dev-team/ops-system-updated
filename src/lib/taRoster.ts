/**
 * Editable TA team roster rules (27 Nov).
 *
 * Pure helpers over `TaPerson[]` stored in `opsSettings` under `ta.roster`.
 * When `ta.roster` has not been customised in Ops yet, callers fall back to the
 * TA System API (or `fakeTa` in tests); once customised, Ops can add/remove TAs
 * locally and optionally merge updates from the live TA System API.
 */

import type { TaPerson } from "@/lib/ta";

export const TA_ROSTER_KEY = "ta.roster";

export const TA_ROLES: { value: "ta" | "ta_lead" | "admin"; label: string }[] = [
  { value: "ta", label: "Talent Acquisition" },
  { value: "ta_lead", label: "TA Lead" },
  { value: "admin", label: "Admin" },
];

export function normalizeTaRole(raw: string | null | undefined): "ta" | "ta_lead" | "admin" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "ta_lead" || s === "ta lead") return "ta_lead";
  if (s === "admin") return "admin";
  return "ta";
}

export function taRoleLabel(taRole: string | null | undefined): string {
  const norm = normalizeTaRole(taRole);
  return TA_ROLES.find((r) => r.value === norm)?.label ?? "Talent Acquisition";
}

/**
 * Parses stored `ta.roster` JSON. Returns `null` when not configured yet so
 * callers fall back to the TA System API / test stand-in.
 */
export function parseTaRoster(raw: string | null | undefined): TaPerson[] | null {
  if (raw === null || raw === undefined || raw === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: TaPerson[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? "").trim();
      const fullName = String(row.fullName ?? "").trim();
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!id || !fullName) continue;
      out.push({
        id,
        fullName,
        email,
        taRole: normalizeTaRole(typeof row.taRole === "string" ? row.taRole : null),
        isActive: row.isActive !== false,
      });
    }
    return out;
  } catch {
    return null;
  }
}

export function sortTaRoster(list: TaPerson[]): TaPerson[] {
  return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function slugId(email: string, fullName: string, existing: Set<string>): string {
  const seed = (email.split("@")[0] || fullName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "member";
  let candidate = `ta_${seed}`;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `ta_${seed}_${n++}`;
  }
  return candidate;
}

export function addTaPersonToRoster(
  current: TaPerson[],
  input: { fullName: string; email: string; taRole: string },
): { ok: true; next: TaPerson[]; added: TaPerson } | { ok: false; reason: string } {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 2) return { ok: false, reason: "Write the TA person's full name." };
  if (!email.includes("@")) return { ok: false, reason: "Write a valid email address." };

  const existingByEmail = current.find((p) => p.email.trim().toLowerCase() === email);
  if (existingByEmail && existingByEmail.isActive) {
    return { ok: false, reason: `${email} is already in the TA list.` };
  }

  const taRole = normalizeTaRole(input.taRole);
  if (existingByEmail) {
    const reactivated: TaPerson = { ...existingByEmail, fullName, taRole, isActive: true };
    return {
      ok: true,
      next: sortTaRoster(current.map((p) => (p.id === existingByEmail.id ? reactivated : p))),
      added: reactivated,
    };
  }

  const ids = new Set(current.map((p) => p.id));
  const added: TaPerson = {
    id: slugId(email, fullName, ids),
    fullName,
    email,
    taRole,
    isActive: true,
  };
  return { ok: true, next: sortTaRoster([...current, added]), added };
}

export function removeTaPersonFromRoster(
  current: TaPerson[],
  taId: string,
): { ok: true; next: TaPerson[]; removed: TaPerson } | { ok: false; reason: string } {
  const target = current.find((p) => p.id === taId && p.isActive);
  if (!target) return { ok: false, reason: "That TA person is not on the list." };
  // Kept as inactive, not deleted, so positions that name this TA still show the name (27 Nov review).
  const removed = { ...target, isActive: false };
  return { ok: true, next: current.map((p) => (p.id === taId ? removed : p)), removed };
}

/**
 * Swaps each roster entry's id for the TA System's id of the same email (27 Nov review): the ids
 * picked from this list are written to TA (primaryRecruiterId, memberIds), so they must be TA's own.
 * shortcut: a person TA does not know keeps an Ops-only `ta_` id, which TA cannot match; add them in
 * the TA System first once Ops writes to TA live.
 */
export function withLiveIds(roster: TaPerson[], live: TaPerson[]): TaPerson[] {
  const liveByEmail = new Map(live.filter((p) => p.email).map((p) => [p.email.trim().toLowerCase(), p.id]));
  return roster.map((p) => {
    const id = liveByEmail.get(p.email.trim().toLowerCase());
    return id && id !== p.id ? { ...p, id } : p;
  });
}

/**
 * The list Ops reads (27 Nov review): the roster with TA's ids, plus TA System people it lacks as
 * inactive, so a position that already names them shows a name while pickers (active only) skip them.
 */
export function rosterWithLive(roster: TaPerson[], live: TaPerson[]): TaPerson[] {
  const next = withLiveIds(roster, live);
  const emails = new Set(next.map((p) => p.email.trim().toLowerCase()));
  const ids = new Set(next.map((p) => p.id));
  const extra = live
    .filter((p) => !ids.has(p.id) && !(p.email && emails.has(p.email.trim().toLowerCase())))
    .map((p) => ({ ...p, email: p.email.trim().toLowerCase(), taRole: normalizeTaRole(p.taRole), isActive: false }));
  return [...next, ...extra];
}

/** Adds TA System people the roster does not have yet; people it has take TA's id. */
export function mergeLiveTaIntoRoster(current: TaPerson[], live: TaPerson[]): TaPerson[] {
  const next = withLiveIds(current, live);
  const emails = new Set(next.map((p) => p.email.trim().toLowerCase()));
  const ids = new Set(next.map((p) => p.id));
  for (const person of live) {
    const emailKey = person.email.trim().toLowerCase();
    if ((emailKey && emails.has(emailKey)) || ids.has(person.id)) continue;
    next.push({ id: person.id, fullName: person.fullName, email: emailKey, taRole: normalizeTaRole(person.taRole), isActive: person.isActive });
  }
  return sortTaRoster(next);
}
