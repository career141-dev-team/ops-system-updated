/**
 * The guarantee, and closing a position (15, Phase 7).
 *
 * The owner's rules, and every one of them has money behind it:
 *
 *   - **Ninety days from joining**, not from payment, and **only valid if the
 *     fee is fully paid**. A client who never paid has no guarantee, which is
 *     the one sentence that decides what a leaver costs us.
 *   - **A warning on day 75**, so a wobble is heard before the clock runs out
 *     rather than after.
 *   - **Replacement first.** A leaver reopens the same position; sixty
 *     working days to finalise a replacement; a refund only by decision, and
 *     the decision is the Director of Operations'.
 *   - **25%.** Clause 6.6 of the owner's ESA says 25% (the Valtrix draft, 17
 *     November). It was 50 from 3 November, when an older draft said so; the
 *     owner chose to follow the current document.
 *   - **A replacement starts a new guarantee**, with no new invoice.
 *
 * Nothing here touches a database or sends anything.
 */

import { DAY, addWorkingDays, workingDaysBetween } from "@/lib/calendar";

export const GUARANTEE_DAYS = 90;
export const WARN_DAY = 75;
export const REPLACEMENT_WORKING_DAYS = 60;

/** The agreement's refund: clause 6.6 of the ESA (17 Nov). */
export const REFUND_PCT = 25;

export type GuaranteeState =
  | "running"
  | "warned"
  | "ended_clean"
  | "replacing"
  | "replaced"
  | "void"
  | "refund_pending"
  | "refunded";

export const GUARANTEE_MEANINGS: Record<GuaranteeState, string> = {
  running: "Running",
  warned: "Running - near the end, warned",
  ended_clean: "Ended cleanly",
  replacing: "They left: finding a replacement",
  replaced: "Replaced, and a new guarantee is running",
  void: "Void - the fee was never paid in full",
  refund_pending: "A refund has been decided",
  refunded: "Refunded",
};

const NEXT: Record<GuaranteeState, GuaranteeState[]> = {
  running: ["warned", "ended_clean", "replacing", "void"],
  warned: ["ended_clean", "replacing", "void"],
  // An ended guarantee is history. A new placement gets a new one.
  ended_clean: [],
  replacing: ["replaced", "refund_pending", "void"],
  replaced: [],
  void: [],
  refund_pending: ["refunded"],
  refunded: [],
};

export function canMoveTo(from: GuaranteeState, to: GuaranteeState): boolean {
  return NEXT[from].includes(to);
}

/** Ninety calendar days from the day they joined, not from the payment. */
export function endsOn(joinedAt: number, days = GUARANTEE_DAYS): number {
  return joinedAt + days * DAY;
}

/** The warning, counted in days from joining so 75 means day 75. */
export function warnOn(joinedAt: number, warnDay = WARN_DAY): number {
  return joinedAt + warnDay * DAY;
}

/**
 * What a leaver means, which turns on one thing only: was the fee paid?
 *
 * The owner's rule. An unpaid fee means there was never a guarantee to
 * honour, so nothing is replaced and nothing refunded - the position simply
 * closes. A paid fee means a replacement, first and before any talk of money.
 */
export function verdictOnLeaver(feePaidAt: number | null): {
  state: GuaranteeState;
  because: string;
} {
  if (!feePaidAt) {
    return {
      state: "void",
      because:
        "The fee was never paid in full, so the guarantee does not apply. Nothing is replaced and nothing is refunded; the position closes.",
    };
  }
  return {
    state: "replacing",
    because: "The fee is paid, so the guarantee holds: a replacement first, and the same position reopens.",
  };
}

export function problemWithLeaver(leftAt: number, reason: string, joinedAt: number, now = Date.now()): string | null {
  if (!Number.isFinite(leftAt)) return "Give the day they left.";
  if (leftAt < joinedAt) return "They cannot have left before they joined.";
  if (leftAt > now + DAY) return "That is in the future.";
  if (reason.trim().length < 4) {
    return "Write why they left, as far as anybody knows. This one decides whether we replace or refund.";
  }
  return null;
}

/** Sixty working days to finalise a replacement, counted as the agreement does. */
export function replacementDeadline(
  from: number,
  workingDays = REPLACEMENT_WORKING_DAYS,
  holidays: string[] = [],
): number {
  return addWorkingDays(from, workingDays, holidays);
}

/** What a refund comes to, at the agreement's percentage. */
export function refundAmount(feePaid: number, pct = REFUND_PCT): number {
  return Math.round(feePaid * (pct / 100) * 100) / 100;
}

/**
 * A refund is a decision, never a timeout.
 *
 * The deadline passing only puts the question in front of the Director of
 * Operations; nothing is refunded because a clock said so.
 */
export function problemWithRefund(
  state: string,
  reason: string,
  deadlineAt: number | null,
  now = Date.now(),
  holidays: string[] = [],
  /** The Director deciding before the sixty days are up, on purpose. */
  early = false,
): string | null {
  if (state !== "replacing") return "A refund is only decided while we are trying to replace somebody.";
  if (reason.trim().length < 4) return "Write the reason for the decision. A refund is read about years later.";
  if (deadlineAt && now < deadlineAt && !early) {
    const left = workingDaysBetween(now, deadlineAt, holidays);
    return (
      "There are still " +
      left +
      " working days to find a replacement, and replacement comes first. You may decide now - tick that you mean to decide early, and it is written down that way."
    );
  }
  return null;
}

/** How long a guarantee has left, in words. */
export function daysLeftInWords(endsAt: number, now = Date.now()): string {
  const days = Math.ceil((endsAt - now) / DAY);
  if (days > 1) return days + " days left";
  if (days === 1) return "the last day";
  return Math.abs(days) + (Math.abs(days) === 1 ? " day over" : " days over");
}

export function guaranteeInWords(
  guarantee: { state: string; endsAt: number; deadlineAt: number | null },
  now = Date.now(),
  // The holidays matter: without them the count said 62 working days to a
  // deadline set at 60, because two poya days inside the window were counted
  // as working days (3 Nov, in the browser).
  holidays: string[] = [],
): string {
  const bits = [GUARANTEE_MEANINGS[guarantee.state as GuaranteeState] ?? guarantee.state];
  if (guarantee.state === "running" || guarantee.state === "warned") {
    bits.push(daysLeftInWords(guarantee.endsAt, now));
  }
  if (guarantee.state === "replacing" && guarantee.deadlineAt) {
    const left = workingDaysBetween(now, guarantee.deadlineAt, holidays);
    bits.push(left > 0 ? left + " working days to replace" : "the time to replace has run out");
  }
  return bits.join(" · ");
}

/* ── Closing a position (steps 11 to 15) ───────────────────────── */

/**
 * The close checklist.
 *
 * Nothing here is clever: it is the list of the things that get forgotten,
 * each one owned by whoever can actually do it. The TA closes its own adverts
 * and its own opening; Ops closes what Ops opened.
 */
export const CLOSE_ITEMS: { key: string; what: string; whose: string; onlyIf?: string }[] = [
  { key: "linkedin", what: "Close the LinkedIn post", whose: "ta", onlyIf: "linkedInUrl" },
  { key: "topjobs", what: "Close the TopJobs advert", whose: "ops", onlyIf: "topJobs" },
  { key: "opening", what: "Close the opening in the TA System", whose: "ops" },
  { key: "lead", what: "Close the lead, if nothing else is open for this client", whose: "ops" },
  { key: "group", what: "Tell the client's WhatsApp group it is closed", whose: "ops" },
];

export const CLOSE_TRIGGERS: Record<string, string> = {
  ended_clean: "The guarantee ended cleanly",
  refunded: "A refund was decided",
  written_off: "The fee was written off",
  void: "The guarantee was void - an unpaid fee",
  client_stopped: "The client stopped the search",
  ta_closed: "The TA System closed the opening first",
  impractical: "The role was not practical at that salary",
};

export interface CloseItem {
  key: string;
  what: string;
  whose: string;
  doneAt: number | null;
  doneBy: string | null;
}

/** The items a close needs, given what this position actually had. */
export function closeItemsFor(position: { linkedInUrl: string | null }, hasTopJobs = false): CloseItem[] {
  return CLOSE_ITEMS.filter((item) => {
    if (item.onlyIf === "linkedInUrl") return Boolean(position.linkedInUrl);
    if (item.onlyIf === "topJobs") return hasTopJobs;
    return true;
  }).map((item) => ({ key: item.key, what: item.what, whose: item.whose, doneAt: null, doneBy: null }));
}

/**
 * Whether an item can be ticked or unticked (18 Nov). The TA opening closes after every advert is down,
 * and once it is ticked TA has been told, so it is not unticked.
 */
export function problemWithTick(items: CloseItem[], key: string): string | null {
  const item = items.find((one) => one.key === key);
  if (!item) return "No such item on this list.";
  if (key === "opening" && item.doneAt) return "The TA System has been told the opening is closed, so this stays ticked.";
  if (key === "opening") {
    // The adverts, the items above it on the list; the lead and the group come after.
    const before = items.filter((one) => (one.key === "linkedin" || one.key === "topjobs") && !one.doneAt);
    if (before.length) return "Take the adverts down first: " + before.map((one) => one.what).join("; ") + ".";
  }
  return null;
}

export function problemWithCloseComplete(items: CloseItem[]): string | null {
  const left = items.filter((item) => !item.doneAt);
  if (left.length) {
    return (
      left.length +
      (left.length === 1 ? " item is" : " items are") +
      " still open: " +
      left.map((item) => item.what).join("; ") +
      "."
    );
  }
  return null;
}

export function closeInWords(checklist: { trigger: string; items: CloseItem[]; completedAt: number | null }): string {
  const done = checklist.items.filter((item) => item.doneAt).length;
  const why = CLOSE_TRIGGERS[checklist.trigger] ?? checklist.trigger;
  if (checklist.completedAt) return "Closed · " + why;
  return why + " · " + done + " of " + checklist.items.length + " done";
}
