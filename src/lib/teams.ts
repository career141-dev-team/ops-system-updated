/**
 * A Teams meeting for an intro call or a requirement meeting (17 Nov).
 *
 * Pure: this only builds what Microsoft is sent and reads what comes back, so
 * every case is testable with nothing sent. `graphCalendar.ts` does the talking.
 *
 * One rule shapes it: the client is never put on the Outlook event. Exchange
 * would email them the moment it is created, which is a message to a client no
 * person approved. The event holds our own side (the organiser's calendar and
 * the TA lead's); the client gets the join link in the drafted invite.
 */

export const MEETING_LENGTHS = [30, 45, 60] as const;
export const DEFAULT_LENGTH = 30;
export const MAX_ATTENDEES = 10;

export interface Attendee {
  name: string;
  email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The client rows off the form: names and emails side by side, blank rows dropped. */
export function attendeesFrom(names: string[], emails: string[]): Attendee[] {
  const rows: Attendee[] = [];
  emails.forEach((raw, i) => {
    const email = raw.trim().toLowerCase();
    if (email) rows.push({ name: (names[i] ?? "").trim(), email });
  });
  return rows;
}

/** Why these client attendees cannot be used, or nothing when they can. */
export function problemWithAttendees(rows: Attendee[]): string | null {
  if (rows.length === 0) return "Add at least one email for the client: that is where the Teams link is sent.";
  if (rows.length > MAX_ATTENDEES) return "That is more than " + MAX_ATTENDEES + " people. Keep the list to who really joins.";
  const seen = new Set<string>();
  for (const row of rows) {
    if (!EMAIL.test(row.email)) return row.email + " is not an email address.";
    if (seen.has(row.email)) return row.email + " is in the list twice.";
    seen.add(row.email);
  }
  return null;
}

export function problemWithLength(lengthMin: number): string | null {
  return Number.isInteger(lengthMin) && lengthMin >= 15 && lengthMin <= 120
    ? null
    : "A meeting is between 15 and 120 minutes long.";
}

/** Colombo wall-clock time, the way Graph wants it beside a time-zone name. */
function colomboLocal(at: number): string {
  return new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 19);
}

export interface EventInput {
  company: string;
  kind: string;
  at: number;
  lengthMin: number;
  /** Replaces the usual "Career 141 and <company>: <what>" title. */
  subject?: string;
  /** False for an interview at their office: a plain calendar event with an address. Default true. */
  online?: boolean;
  location?: string;
  /** Our own people only. Never a client address. */
  internalAttendees: Attendee[];
}

/** The body of `POST /users/{organiser}/events`. */
export function eventFor(input: EventInput) {
  const what = input.kind === "intro" ? "Intro call" : "Requirement meeting";
  const online = input.online !== false;
  return {
    subject: input.subject ?? "Career 141 and " + input.company + ": " + what,
    start: { dateTime: colomboLocal(input.at), timeZone: "Sri Lanka Standard Time" },
    end: { dateTime: colomboLocal(input.at + input.lengthMin * 60_000), timeZone: "Sri Lanka Standard Time" },
    isOnlineMeeting: online,
    ...(online ? { onlineMeetingProvider: "teamsForBusiness" } : {}),
    ...(input.location ? { location: { displayName: input.location } } : {}),
    // Microsoft's own invites would tell the attendees; we only list ours.
    attendees: input.internalAttendees.map((a) => ({
      emailAddress: { address: a.email, name: a.name || a.email },
      type: "required",
    })),
  };
}

/**
 * The event id and the join link out of Graph's answer, or nothing. An event
 * that is not online has no link, so `needLink` is false for it.
 */
export function readEvent(json: unknown, needLink = true): { eventId: string; joinUrl: string } | null {
  const body = json as { id?: unknown; onlineMeeting?: { joinUrl?: unknown } | null } | null;
  const eventId = typeof body?.id === "string" ? body.id : "";
  const joinUrl = typeof body?.onlineMeeting?.joinUrl === "string" ? body.onlineMeeting.joinUrl : "";
  return eventId && (joinUrl || !needLink) ? { eventId, joinUrl } : null;
}

/** What went wrong, in a sentence a person can act on. */
export function sayGraphFailure(status: number, organiserEmail: string): string {
  if (status === 401 || status === 403) {
    return "Microsoft refused: the calendar permission (Calendars.ReadWrite) is not granted to the app, or the app is not allowed to reach " + organiserEmail + ".";
  }
  if (status === 404) return "Microsoft has no mailbox called " + organiserEmail + ". Check that email on the team list.";
  if (status === 429) return "Microsoft asked us to slow down. Try again in a minute.";
  return "Microsoft could not make the meeting (" + status + ").";
}
