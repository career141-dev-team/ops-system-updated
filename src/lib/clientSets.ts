/**
 * The CVs that go to the client (15, Phase 4 steps 2 to 4).
 *
 * This is the moment the client finally sees something, and the board says
 * what goes wrong with it today: a set promised in the agreement and sent
 * weeks later, CVs sent from somebody's own inbox so nobody else can see what
 * was sent, and a set that went out with three CVs when the rule is five.
 *
 * So three things are fixed here. The set is **due** from the day the
 * agreement was signed, not from when somebody remembers. Every CV is fetched
 * once and kept, so what the client received can be read back a year later,
 * whatever TA does afterwards. And the set cannot go out short, or to nobody.
 *
 * Nothing here touches a database or sends anything.
 */

export type SetState = "ready" | "reviewing" | "sent" | "withdrawn";

export const STATE_MEANINGS: Record<SetState, string> = {
  ready: "TA says it is ready",
  reviewing: "Being read before it goes",
  sent: "Sent to the client",
  withdrawn: "Pulled back, not sent",
};

const NEXT: Record<SetState, SetState[]> = {
  ready: ["reviewing", "withdrawn"],
  reviewing: ["sent", "withdrawn"],
  // A sent set is history. A change of mind is a new set, as TA numbers them.
  sent: [],
  withdrawn: ["reviewing"],
};

export function canMoveTo(from: SetState, to: SetState): boolean {
  return NEXT[from].includes(to);
}

/**
 * The fewest CVs a client set may hold.
 *
 * The owner's rule, and TA enforces it too: fewer than five and the search
 * carries on rather than the client being given a thin set to judge us by.
 */
export const MIN_CVS = 5;

/**
 * What the set is called, everywhere: "CLIENT > ROLE > SET n".
 *
 * The desk already types this by hand into email subjects, and the mail reader
 * matches on it, so it is built the same way here rather than invented.
 */
export function setName(client: string, role: string, setNumber: number): string {
  return [client.trim().toUpperCase(), role.trim().toUpperCase(), "SET " + setNumber].join(" > ");
}

/**
 * When the set is due at the client.
 *
 * Counted from the day the agreement was signed, in calendar days, because
 * that is what the client was promised: "seven to fourteen days". The first
 * set uses the shorter end of the promise, a later one the longer.
 */
export function dueFromEsa(signedAt: number, setNumber: number, firstDays = 7, laterDays = 14): number {
  return signedAt + (setNumber <= 1 ? firstDays : laterDays) * 86_400_000;
}

/** How late, or how long left, in words a person can act on. */
export function dueInWords(dueAt: number, now: number): string {
  const days = Math.round((dueAt - now) / 86_400_000);
  if (days < 0) return Math.abs(days) + (Math.abs(days) === 1 ? " day late" : " days late");
  if (days === 0) return "due today";
  return "due in " + days + (days === 1 ? " day" : " days");
}

export interface SetCandidate {
  /** TA's application id: the one thing both systems agree on. */
  applicationTaId: string;
  name: string;
  /** Our own copy of the prepared CV, once it is fetched. */
  fileId: string | null;
  /** Why there is no CV, when there is not. */
  problem: string | null;
  /** Our own team's interview of them, before their CV goes to the client (owner, 16 Nov). */
  internalInterview?: InternalInterview | null;
}

/**
 * The team interviews a candidate before the client sees the CV (owner, 16 Nov).
 *
 * Only a pass lets the CV go. "hold" means not decided yet, "fail" takes the
 * candidate out of the set. Notes are required for the two that stop it, so
 * the next person knows why.
 */
export type InternalOutcome = "pass" | "hold" | "fail";
export const INTERNAL_OUTCOMES: InternalOutcome[] = ["pass", "hold", "fail"];
export const INTERNAL_MEANINGS: Record<InternalOutcome, string> = {
  pass: "Passed our interview",
  hold: "On hold, not decided",
  fail: "Failed our interview",
};

export interface InternalInterview {
  /** The member who held it. */
  by: string;
  at: number;
  outcome: InternalOutcome;
  notes: string;
}

export function problemWithInternalInterview(outcome: string, notes: string): string | null {
  if (!INTERNAL_OUTCOMES.includes(outcome as InternalOutcome)) return "Choose pass, hold or fail.";
  if (outcome !== "pass" && notes.trim().length < 4) {
    return "Write what you found: a hold or a fail needs its reason.";
  }
  return null;
}

/**
 * Why the set cannot go out yet.
 *
 * Every refusal here is something a person can fix, and says which candidate
 * or which address is the trouble.
 */
export function problemWithSending(
  candidates: SetCandidate[],
  to: string[],
  minimum = MIN_CVS,
  requireInternalInterview = false,
): string | null {
  if (!to.length) return "Nobody to send it to. The client has no contact marked “hr” in the TA System.";
  if (candidates.length < minimum) {
    return (
      "A set goes to a client with at least " +
      minimum +
      " CVs; this one has " +
      candidates.length +
      ". The search carries on until it does."
    );
  }
  const missing = candidates.filter((c) => !c.fileId);
  if (missing.length) {
    return (
      "No CV kept for " +
      missing.map((c) => c.name).join(", ") +
      ". Read the set again, and if TA still has no prepared CV the candidate comes out of it."
    );
  }
  if (requireInternalInterview) {
    const waiting = candidates.filter((c) => c.internalInterview?.outcome !== "pass");
    if (waiting.length) {
      return (
        "Our own interview has not passed for " +
        waiting.map((c) => c.name).join(", ") +
        ". Record it on the candidate's page, or an ops lead can switch the rule off in Settings."
      );
    }
  }
  return null;
}

/** One line for the list: where the set stands. */
export function whereItStands(
  set: { state: string; setNumber: number; candidates: SetCandidate[]; dueAt: number | null; sentAt: number | null; receivedAt: number | null },
  now: number,
): string {
  const held = set.candidates.length + (set.candidates.length === 1 ? " CV" : " CVs");
  if (set.state === "sent") {
    const at = set.receivedAt ?? set.sentAt;
    const days = at ? Math.max(0, Math.round((now - at) / 86_400_000)) : null;
    return (
      "Sent, " +
      held +
      (days === null ? "" : days === 0 ? " · today" : " · " + days + (days === 1 ? " day ago" : " days ago"))
    );
  }
  if (set.state === "withdrawn") return "Pulled back. " + held;
  const due = set.dueAt === null ? "no date yet" : dueInWords(set.dueAt, now);
  const short = set.candidates.length < MIN_CVS ? " · short of " + MIN_CVS : "";
  return (STATE_MEANINGS[set.state as SetState] ?? set.state) + ", " + held + " · " + due + short;
}

/**
 * The zip of a set's CVs (16 Nov): "Client - Position - set N.zip".
 *
 * Characters Windows and Content-Disposition both dislike are dropped, so the
 * name survives being saved on any laptop.
 */
export function zipName(client: string, role: string, setNumber: number): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return clean(client) + " - " + clean(role) + " - set " + setNumber + ".zip";
}

/** Why the zip cannot be made, or null. A zip with a hole in it would be a quiet lie about the set. */
export function problemWithZip(candidates: SetCandidate[]): string | null {
  if (!candidates.length) return "This set has no candidates.";
  const missing = candidates.filter((c) => !c.fileId);
  if (!missing.length) return null;
  return "No CV kept for " + missing.map((c) => c.name).join(", ") + ". Read the set first, so every CV is kept.";
}

/** One name per file inside the zip: a second "Name.pdf" becomes "Name (2).pdf" rather than overwriting the first. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) + " (" + n + ")" + name.slice(dot) : name + " (" + n + ")";
  });
}
