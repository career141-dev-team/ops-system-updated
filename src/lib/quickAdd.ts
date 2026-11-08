/**
 * Quick-add from anywhere (7 Nov, UX order 5).
 *
 * A client rings while you are on the invoices page. Until now the call was
 * written down on /calls, the note was a task made on the task's own page,
 * and a new enquiry was a form on /leads - three journeys away from where
 * you were standing, each ending somewhere else. So three small forms in the
 * sidebar, on every page, that save and leave you where you were.
 *
 * Nothing new is stored. A call is the same call log, an enquiry is the same
 * lead, and a note is a task to yourself - the thing the desk already has
 * for "do not forget", with a morning to come back to it. The rules here
 * decide only what a note becomes and whom it is about.
 */

import { nextNineAm } from "@/lib/calendar";

export const QUICK_KINDS = ["call", "note", "enquiry"] as const;
export type QuickKind = (typeof QUICK_KINDS)[number];

export function problemWithNote(text: string): string | null {
  const t = text.trim();
  if (!t) return "Write the note.";
  if (t.length < 4) return "Write a little more.";
  return null;
}

/**
 * A note becomes a task to yourself: the first line is the title, the rest
 * the body, due the next nine in the morning so it is on Your day tomorrow
 * rather than lost in a list. A note typed at eight is due at nine today.
 */
export function noteToTask(
  text: string,
  by: string,
  now: number,
  about: { subjectType: string; subjectId: string; link: string } | null,
): { kind: "remind"; title: string; body: string; assigneeId: string; dueAt: number; subjectType: string | null; subjectId: string | null; link: string | null } {
  const lines = text.trim().split(/\r?\n/);
  const first = lines[0].trim();
  const title = first.length > 80 ? first.slice(0, 77).trimEnd() + "..." : first;
  const body = lines.slice(1).join("\n").trim();
  return {
    kind: "remind",
    title,
    body,
    assigneeId: by,
    dueAt: nextNineAm(now),
    subjectType: about?.subjectType ?? null,
    subjectId: about?.subjectId ?? null,
    link: about?.link ?? null,
  };
}

/**
 * Whom a quick thing is about, from a name typed into a box with the
 * clients' names behind it. Only an exact name (any case, spare spaces
 * ignored) matches: "Nippon" is not Nippon Paint Lanka, and a note filed
 * against the wrong client is worse than one filed against none. No match
 * saves the thing unattached, with the name kept in its words.
 */
export function clientNamed<T extends { id: string; name: string }>(name: string, clients: T[]): T | null {
  const key = name.trim().replace(/\s+/g, " ").toLowerCase();
  if (!key) return null;
  return clients.find((c) => c.name.trim().replace(/\s+/g, " ").toLowerCase() === key) ?? null;
}
