/**
 * What the TA System tells us, in order (15, Part E3; Phase 1 step 22).
 *
 * This is the fix for the worst problem on the owner's board: news passed by
 * hand arrives late — a signed agreement reaching the Director months later,
 * Asma hearing of a January joining on 30 March. TA writes an event for
 * everything that matters; Ops reads them in order and never goes backwards.
 *
 * The cursor is the point of the design: it only moves past a batch that was
 * handled. An event that cannot be handled stops the line rather than being
 * skipped, because a skipped placement is exactly the thing being fixed.
 *
 * In this phase no event does anything yet — the records they would touch are
 * built in Phases 2 to 7 — so every known event is recorded as "nothing to do
 * with this yet". That is honest, and the day a handler arrives the reader
 * does not change.
 */

/** Every event the plan says TA raises. Anything else is kept and flagged. */
export const KNOWN_EVENTS = [
  "opening.created",
  "opening.updated",
  "opening.closed",
  "opening.jd_approved",
  "opening.working_stage_changed",
  "jobpost.live",
  "jobpost.closed",
  "application.stage_changed",
  "director_round.sent",
  "director_round.decided",
  "client_set.ready",
  "interview.booked",
  "interview.confirmed",
  "interview.candidate_out",
  "interview.outcome",
  "interview.feedback",
  "reference.reported",
  "offer.made",
  "offer.accepted",
  "offer.declined",
  "placement.created",
  "placement.joined",
  "placement.no_show",
  "placement.fell_through",
  "candidate.rejection_notice_sent",
  "notification.for_ops",
] as const;

export function isKnownEvent(type: string): boolean {
  return (KNOWN_EVENTS as readonly string[]).includes(type);
}

/**
 * Which phase will do something about an event, so a recorded event says why
 * nothing happened rather than looking lost.
 */
export function whatWeDoWithIt(type: string): string {
  if (!isKnownEvent(type)) return "We do not know this kind of event. Kept for somebody to look at.";
  if (type.startsWith("opening.") || type.startsWith("jobpost.")) return "Recorded. The opening side is Phase 3.";
  if (type.startsWith("client_set.") || type.startsWith("application.") || type.startsWith("director_round.")) {
    return "Recorded. The client side of the search is Phase 4.";
  }
  if (type.startsWith("interview.") || type.startsWith("reference.")) return "Recorded. Interviews are Phase 5.";
  if (type.startsWith("offer.") || type.startsWith("placement.")) return "Recorded. Placement and money are Phase 6.";
  return "Recorded.";
}

export interface EventLike {
  taEventId: string;
  handledAt: number | null;
}

/**
 * How far the cursor may move.
 *
 * Up to, but not past, the first event that is not handled. An empty batch
 * leaves it where it was.
 */
export function cursorAfter(batch: EventLike[], cursor: string): string {
  let furthest = cursor;
  for (const event of batch) {
    if (event.handledAt === null) break;
    furthest = event.taEventId;
  }
  return furthest;
}

/** How old the cursor is, in the words the health screen shows. */
export function cursorAgeInWords(lastReadAt: number | null, now = Date.now()): string {
  if (!lastReadAt) return "The TA System's events have never been read.";
  const mins = Math.round((now - lastReadAt) / 60_000);
  if (mins < 2) return "Read less than two minutes ago.";
  if (mins < 60) return "Read " + mins + " minutes ago.";
  const hours = Math.round(mins / 60);
  return "Read " + hours + (hours === 1 ? " hour" : " hours") + " ago. That is too long; something has stopped.";
}
