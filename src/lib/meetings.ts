/**
 * Meetings with a client (15, Phase 2 steps 7 and 8).
 *
 * Two meetings matter in Ops, and they are the same shape: the intro call,
 * where we meet a new client, and the requirement meeting, where we learn what
 * the position actually is. Both have the same three problems from the owner's
 * board, and these rules are the answers:
 *
 *   * They are not held, and nobody chases. So a meeting that is not held
 *     makes a rebook task, and three rebooks with no reply from the client
 *     closes the lead with a reason - the owner's rule, not a guess.
 *   * People forget they are on. So two reminders: the day before at nine,
 *     and an hour before.
 *   * What was said stays in somebody's head. So a meeting cannot be marked
 *     held without the brief written down, which is the fix for "the
 *     requirement was in the TA lead's head".
 *
 * Nothing here touches a database.
 */

import { DAY, HOUR, colomboHour, inWorkingHours, isWorkingDay, nextNineAm } from "./calendar";
import { problemWithLength } from "./teams";

export const MEETING_KINDS = ["intro", "requirement"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const KIND_MEANINGS: Record<MeetingKind, string> = {
  intro: "Intro call",
  requirement: "Requirement meeting",
};

export type MeetingState = "booked" | "held" | "not_held" | "cancelled";

export const STATE_MEANINGS: Record<MeetingState, string> = {
  booked: "Booked",
  held: "Held",
  not_held: "Not held",
  cancelled: "Cancelled",
};

/** The owner's rule: three rebook emails with no reply closes the lead. */
export const MAX_REBOOKS = 3;

export interface Booking {
  at: number;
  /** The TA lead is on every intro call (the owner's rule). */
  taLeadId: string;
}

/**
 * Why this booking cannot be saved, or nothing when it can.
 *
 * A time in the past is a typo. A time outside working hours is usually a
 * time zone mistake, which matters because the client is in Colombo and so
 * are we - but a client who wants 07:30 gets 07:30, so this only refuses the
 * middle of the night.
 */
export function problemWithBooking(
  booking: { at: number; taLeadId: string; lengthMin?: number },
  now: number,
): string | null {
  if (booking.lengthMin !== undefined) {
    const long = problemWithLength(booking.lengthMin);
    if (long) return long;
  }
  if (!Number.isFinite(booking.at) || booking.at === 0) return "Say when the meeting is.";
  if (booking.at < now) return "That time has already passed.";
  if (booking.at > now + 365 * DAY) return "That is more than a year away. Check the date.";
  const hour = colomboHour(booking.at);
  if (hour < 6 || hour >= 21) return "That is the middle of the night in Colombo. Check the time.";
  if (!booking.taLeadId) return "Say which TA lead is joining. One is on every intro call.";
  return null;
}

/** Said on the screen when the time is odd but allowed. */
export function warningAboutBooking(at: number, holidays: string[] = []): string | null {
  if (!isWorkingDay(at, holidays)) return "That is not a working day. Check with the client that they mean it.";
  if (!inWorkingHours(at)) return "That is outside 08:00 to 20:00. Allowed, but check the client means it.";
  return null;
}

export interface Reminder {
  kind: string;
  dueAt: number;
  label: string;
}

/**
 * The two reminders for a meeting.
 *
 * The day before at nine is for the person: there is still time to chase a
 * client who has gone quiet. The hour before is for the meeting itself. A
 * meeting booked for later today gets only the second one - a reminder for
 * yesterday is noise.
 */
export function remindersFor(at: number, now: number): Reminder[] {
  const reminders: Reminder[] = [];
  const dayBeforeNine = nextNineAm(at - 2 * DAY);
  if (dayBeforeNine > now && dayBeforeNine < at) {
    reminders.push({ kind: "meeting.reminder.day", dueAt: dayBeforeNine, label: "Tomorrow" });
  }
  const hourBefore = at - HOUR;
  if (hourBefore > now) {
    reminders.push({ kind: "meeting.reminder.hour", dueAt: hourBefore, label: "In an hour" });
  }
  return reminders;
}

export interface NotHeldOutcome {
  /** What happens now: another go, or the lead closes. */
  action: "rebook" | "close";
  rebookCount: number;
  because: string;
}

/**
 * A meeting was not held. What now?
 *
 * Rebooking continues while the client is still answering. The count is of
 * our own attempts, so the third one that goes unanswered is where it stops -
 * and it stops with a reason, because nothing closes without one.
 */
export function afterNotHeld(rebookCount: number, clientReplied: boolean): NotHeldOutcome {
  const next = rebookCount + 1;
  if (clientReplied) {
    return { action: "rebook", rebookCount: next, because: "The client is still answering, so book it again." };
  }
  if (next >= MAX_REBOOKS) {
    return {
      action: "close",
      rebookCount: next,
      because: "Three attempts and no reply from the client. The lead closes.",
    };
  }
  return {
    action: "rebook",
    rebookCount: next,
    because: "Attempt " + next + " of " + MAX_REBOOKS + ". Book it again and tell them.",
  };
}

export interface HeldNotes {
  brief: string;
  role: string;
  packageSaid: string;
}

/**
 * Why a meeting cannot be marked held yet.
 *
 * The brief is required, and that is the whole point: "the requirement was in
 * the TA lead's head" is on the owner's problem list, and a meeting that can
 * be closed with an empty box is how it stays there. The role and the package
 * are asked for but not forced - a client who will not say a salary on the
 * first call is normal, and refusing to save the call would lose the rest.
 */
export function problemWithHeld(notes: HeldNotes): string | null {
  if (notes.brief.trim().length < 10) {
    return "Write what they said, in a sentence or two. This is the only record of it.";
  }
  return null;
}

export function missingFromHeld(notes: HeldNotes): string[] {
  const missing: string[] = [];
  if (!notes.role.trim()) missing.push("the position");
  if (!notes.packageSaid.trim()) missing.push("the package they have in mind");
  return missing;
}

/** When the agreement has to be out by, from the settings' hours. */
export function agreementDueAt(heldAt: number, hours: number): number {
  return heldAt + hours * HOUR;
}

/**
 * The booked meetings in the days ahead (15, Phase 2 step 20).
 *
 * The view the desk actually asks for every morning: who are we talking to,
 * and when. Soonest first, and a meeting whose time has passed while nobody
 * marked it held or not held stays in the list rather than disappearing — that
 * is exactly the one somebody has to chase.
 */
export function meetingsAhead<T extends { at: number; state: string }>(
  meetings: T[],
  now: number,
  withinDays = 7,
): T[] {
  const until = now + withinDays * 86_400_000;
  return meetings
    .filter((m) => m.state === "booked" && m.at <= until)
    .sort((a, b) => a.at - b.at);
}

/** "Tomorrow at 10:30", in Colombo, or how long ago it should have happened. */
export function whenInWords(at: number, now: number): string {
  const day = (t: number) => new Date(t + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const time = new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);
  const days = Math.round((Date.parse(day(at)) - Date.parse(day(now))) / 86_400_000);
  if (days < 0) {
    const ago = -days;
    return (ago === 1 ? "Yesterday" : ago + " days ago") + " at " + time + " — was it held?";
  }
  if (days === 0) return "Today at " + time;
  if (days === 1) return "Tomorrow at " + time;
  return day(at) + " at " + time;
}
