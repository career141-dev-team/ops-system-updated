/**
 * A calendar invite as a plain .ics file (16 Nov, plan B2).
 *
 * Pure: no database, nothing sent. The invite is attached to a DRAFT email, so
 * a person still reads and approves it before any client sees it. Times are
 * written in UTC (`...Z`), which every calendar converts to the reader's own
 * zone, so Colombo (UTC+5:30, no daylight saving) is only ever a display
 * concern - it is spelled out in the description for the human reading it.
 *
 * The UID is stable per thing, and SEQUENCE goes up on every move, so a
 * rescheduled interview updates the client's calendar entry instead of adding
 * a second one next to it.
 */

import { COLOMBO_OFFSET_MS, colomboDateInWords } from "./calendar";

export interface InviteInput {
  /** Stable for the life of the thing: "interview-<id>", never a time. */
  uid: string;
  startsAt: number;
  /** Defaults to an hour after the start. */
  endsAt?: number;
  summary: string;
  description?: string;
  /** An address, or a meeting link for an online one. */
  location?: string;
  /** The pasted Teams link, if there is one. */
  url?: string;
  organizer?: { name: string; email: string };
  attendees?: string[];
  /** 0 for the first invite, one more for every move. */
  sequence?: number;
  /** When it was made; a parameter so a test is not tied to the clock. */
  now?: number;
}

const HOUR = 3_600_000;

/** `20261120T090000Z`. */
export function icsTime(at: number): string {
  return new Date(at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** The words a person reads for the time, in Colombo: "20 November 2026, 14:30 (Colombo)". */
export function colomboWhen(at: number): string {
  return colomboDateInWords(at) + ", " + new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(11, 16) + " (Colombo)";
}

/** Backslash, semicolon, comma and line breaks are the four things RFC 5545 makes us escape in text. */
export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines are folded at 75 characters, continuation lines start with a space. */
// shortcut: counts characters, not octets, so a line of pure non-ASCII could run long; upgrade if such names bite.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}

/** A pasted value must never carry a line break into another field. */
function oneLine(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

export function buildInvite(input: InviteInput): string {
  const now = input.now ?? Date.now();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career 141//Ops//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    "UID:" + oneLine(input.uid),
    "DTSTAMP:" + icsTime(now),
    "SEQUENCE:" + (input.sequence ?? 0),
    "DTSTART:" + icsTime(input.startsAt),
    "DTEND:" + icsTime(input.endsAt ?? input.startsAt + HOUR),
    "SUMMARY:" + icsEscape(oneLine(input.summary)),
  ];
  const description = [input.description?.trim(), "Time: " + colomboWhen(input.startsAt)].filter(Boolean).join("\n");
  lines.push("DESCRIPTION:" + icsEscape(description));
  if (input.location?.trim()) lines.push("LOCATION:" + icsEscape(oneLine(input.location)));
  if (input.url?.trim()) lines.push("URL:" + oneLine(input.url));
  if (input.organizer?.email.includes("@")) {
    const name = oneLine(input.organizer.name).replace(/["':;,]/g, "");
    lines.push("ORGANIZER;CN=" + name + ":mailto:" + oneLine(input.organizer.email));
  }
  for (const who of input.attendees ?? []) {
    if (who.includes("@")) lines.push("ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:" + oneLine(who));
  }
  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
