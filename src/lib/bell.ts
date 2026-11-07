/**
 * What the bell counts (7 Nov, UX order 3).
 *
 * The owner's point: if a client replies while you are on the Positions
 * page, nothing changes anywhere. You find out when you go back to Your day.
 * The system knows - it just does not say.
 *
 * So one number, in the sidebar, kept live. It is the same three things the
 * top of Your day shows, added up, so the bell and the page can never
 * disagree about how much is waiting on you:
 *
 *   - drafts waiting for your approval
 *   - your own open tasks, late ones counted separately so the bell can go red
 *   - mail that has arrived and nobody has filed or acted on
 *
 * Nothing else. A count that includes things that are not yours is a count
 * somebody stops looking at.
 */

export interface Bell {
  /** Everything waiting on you, late included. */
  waiting: number;
  /** How much of it is past its time. */
  late: number;
  /** Mail that has arrived and nobody has touched. Part of `waiting`. */
  inbox: number;
}

export function bellOf(
  db: {
    messages: { state: string }[];
    tasks: { state: string; assigneeId: string; dueAt: number }[];
    inbound: { readState: string }[];
  },
  memberId: string,
  now: number,
): Bell {
  const drafts = db.messages.filter((m) => m.state === "draft").length;
  const mine = db.tasks.filter((t) => t.state === "open" && t.assigneeId === memberId);
  const late = mine.filter((t) => t.dueAt < now).length;
  const inbox = db.inbound.filter((i) => i.readState === "new").length;
  return { waiting: drafts + mine.length + inbox, late, inbox };
}

/** Said beside the number, and read aloud by a screen reader. */
export function bellInWords(bell: Bell): string {
  if (bell.waiting === 0) return "Nothing is waiting on you.";
  const parts: string[] = [];
  parts.push(bell.waiting + (bell.waiting === 1 ? " thing waiting on you" : " things waiting on you"));
  if (bell.late) parts.push(bell.late + " late");
  if (bell.inbox) parts.push(bell.inbox + " new in the inbox");
  return parts.join(", ") + ".";
}
