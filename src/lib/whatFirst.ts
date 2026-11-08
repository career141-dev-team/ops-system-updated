/**
 * What to do first today (8 Nov, UX order 6; 15, Phase 9 step 12).
 *
 * The owner's point: the ten minutes of working out where to start. Your
 * day already shows everything waiting in three lists; this puts one thing
 * at the top, chosen **by the rules**, with the AI writing only the one-line
 * reason. A broken model must never change what is urgent, so the order is
 * here, pure and tested, and the model is handed the answer and asked why.
 *
 * The order, which is how the desk already thinks:
 *
 *   1. late tasks, the most late first - a clock has already run out;
 *   2. drafts a person must read, because a client is waiting on them;
 *   3. tasks due today, the soonest first;
 *   4. a clock running out inside the day, the soonest first;
 *   5. routine notices, which the one button takes all at once.
 */

export interface DayItem {
  /** One line, in the desk's own words. */
  said: string;
  href: string;
  kind: "late" | "draft" | "due" | "clock" | "routine";
  /** When it is or was due; what the kind is sorted by. */
  at: number;
}

const RANK: Record<DayItem["kind"], number> = { late: 0, draft: 1, due: 2, clock: 3, routine: 4 };

export function orderTheDay(items: DayItem[]): DayItem[] {
  return [...items].sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.at - b.at);
}

/** The first thing and the rest, or null when the day is clear. */
export function whatFirst(items: DayItem[]): { first: DayItem; others: DayItem[] } | null {
  const [first, ...others] = orderTheDay(items);
  return first ? { first, others } : null;
}

/** Why the rules put it first, said without a model - the line the page falls back to. */
export function firstBecause(first: DayItem, others: DayItem[]): string {
  const more = others.length ? ` ${others.length} more ${others.length === 1 ? "waits" : "wait"} behind it.` : " Nothing else is waiting.";
  switch (first.kind) {
    case "late": return "It is already late, and nothing else is." + more;
    case "draft": return "A client is waiting on this and only a person can send it." + more;
    case "due": return "It is the soonest thing due today." + more;
    case "clock": return "This clock runs out first." + more;
    case "routine": return "Only routine notices are left; one button sends them all." + more;
  }
}

/** The key a day's answer is kept under: the same person, day and first thing read the same line. */
export function whatFirstKey(memberId: string, day: string, first: DayItem): string {
  return memberId + "|" + day + "|" + first.href;
}
