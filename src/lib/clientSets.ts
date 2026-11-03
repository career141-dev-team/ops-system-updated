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
