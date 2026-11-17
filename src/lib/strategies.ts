/**
 * Standard sourcing strategies from the TA System and who is working on each
 * one for an opening (17 Nov).
 *
 * Pure: no database and no network, so every rule is testable on its own.
 */

export const TA_STRATEGIES = [
  "LinkedIn Search",
  "Recruiter Search & POST",
  "Direct Headhunt",
  "SCOOP",
  "InMail",
  "Designation wise search",
  "Previous Post screening",
  "L search Extraction",
  "Company Extraction",
  "Referral Extraction",
  "Repository",
  "Smart Ad",
  "AI Search",
  "Identify shortlisted candidates and do company",
  "Email Campaign",
  "Aura",
  "ChatGPT",
  "Gemini",
  "Linked Post",
] as const;

export type TaStrategy = (typeof TA_STRATEGIES)[number];

const TA_PREFIX = "ta:";

/** Encode a TA user id so it never collides with an Ops member id in `ownerId`. */
export function taOwnerId(taUserId: string): string {
  return TA_PREFIX + taUserId;
}

export function isTaOwnerId(ownerId: string): boolean {
  return ownerId.startsWith(TA_PREFIX);
}

export function stripTaPrefix(ownerId: string): string {
  return isTaOwnerId(ownerId) ? ownerId.slice(TA_PREFIX.length) : ownerId;
}

export function formatStrategyText(strategy: string, note?: string): string {
  const cleanNote = (note ?? "").trim();
  return cleanNote ? `${strategy} — ${cleanNote}` : strategy;
}

export function strategyNameOf(text: string): string {
  const idx = text.indexOf(" — ");
  return idx === -1 ? text : text.slice(0, idx);
}

export interface StrategyValidationInput {
  strategy: string;
  ownerId: string;
  validOpsIds: string[];
  validTaIds: string[];
  existing: { text: string; ownerId: string }[];
}

/** Why this strategy assignment cannot be added, or null when it is valid. */
export function problemWithStrategy(input: StrategyValidationInput): string | null {
  if (!TA_STRATEGIES.includes(input.strategy as TaStrategy)) {
    return "Pick a strategy from the list.";
  }
  const ownerOk = isTaOwnerId(input.ownerId)
    ? input.validTaIds.includes(stripTaPrefix(input.ownerId))
    : input.validOpsIds.includes(input.ownerId);
  if (!ownerOk) {
    return "Pick who is working on this strategy.";
  }
  const duplicate = input.existing.some(
    (s) => strategyNameOf(s.text) === input.strategy && s.ownerId === input.ownerId,
  );
  if (duplicate) {
    return "That strategy is already assigned to them on this opening.";
  }
  return null;
}

export function resolveStrategyOwner(
  ownerId: string,
  members: { id: string; name: string }[],
  taPeople: { id: string; fullName: string }[],
): { name: string; team: "Ops" | "TA" } | null {
  if (isTaOwnerId(ownerId)) {
    const raw = stripTaPrefix(ownerId);
    const ta = taPeople.find((p) => p.id === raw);
    return ta ? { name: ta.fullName, team: "TA" } : null;
  }
  const ops = members.find((m) => m.id === ownerId);
  return ops ? { name: ops.name, team: "Ops" } : null;
}

export interface StrategyPick {
  strategy: string;
  ownerId: string;
  note?: string;
}

/** Validate and build new strategy entries for a batch of picks on one opening. */
export function tryBuildStrategyAdditions(
  picks: StrategyPick[],
  validOpsIds: string[],
  validTaIds: string[],
  existing: { text: string; ownerId: string }[],
  now: number,
): { ok: true; added: { id: string; text: string; ownerId: string; at: number }[] } | { ok: false; reason: string } {
  if (picks.length === 0) {
    return { ok: false, reason: "Tick at least one strategy to add." };
  }
  const seen = [...existing];
  const added: { id: string; text: string; ownerId: string; at: number }[] = [];
  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i];
    const err = problemWithStrategy({
      strategy: pick.strategy,
      ownerId: pick.ownerId,
      validOpsIds,
      validTaIds,
      existing: seen,
    });
    if (err) return { ok: false, reason: err };
    const text = formatStrategyText(pick.strategy, pick.note);
    const entry = { id: "st_" + now.toString(36) + "_" + i, text, ownerId: pick.ownerId, at: now };
    added.push(entry);
    seen.push(entry);
  }
  return { ok: true, added };
}
