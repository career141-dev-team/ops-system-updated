/**
 * The wording of the messages we send, kept as records (15, Phase 1 step 25).
 *
 * Why these are not strings in the code. The wording is the business's, not the
 * programmer's: the ops lead changes a chase email the week a client complains
 * about it, and nobody should wait for a release. And the same words have to go
 * out every time, because the alternative is what the board shows happening
 * today — the same chase retyped by hand, slightly different each time, and a
 * candidate heard nothing because the person meant to write and did not.
 *
 * The one rule that matters more than the wording is about holes. A template is
 * written with `{{holes}}`, and a hole that is still empty must stop the send,
 * not go out as it stands. That is the Best Pacific incident on the board: an
 * agreement went to a client with its placeholders still in it. So the rules
 * below answer, for any template and any set of values, which holes are
 * unfilled — and the send path refuses while that list is not empty.
 *
 * Pure: no database, no network, so it is all tested on its own.
 */

import type { OpsTemplate } from "@/data/types";

export type { OpsTemplate };

/** `{{this}}` and `{{that}}`, in the order they appear, each named once. */
export function holesIn(text: string): string[] {
  const found = text.match(/\{\{\s*\w+\s*\}\}/g) ?? [];
  return [...new Set(found.map((h) => h.replace(/[^\w]/g, "")))];
}

/** Every hole a template needs filled, subject and body together. */
export function holesNeeded(template: Pick<OpsTemplate, "subject" | "body">): string[] {
  return [...new Set([...holesIn(template.subject), ...holesIn(template.body)])];
}

export interface Filled {
  subject: string;
  body: string;
  /** Holes still empty. While this has anything in it, nothing may be sent. */
  missing: string[];
}

/**
 * The template with the values put in. A value that is missing, or is only
 * spaces, leaves the hole visible: a draft that reads "Dear {{contact}}" is
 * obviously unfinished, while a draft that reads "Dear ," looks finished and
 * is worse.
 */
export function fill(template: Pick<OpsTemplate, "subject" | "body">, values: Record<string, string>): Filled {
  const missing: string[] = [];
  const put = (text: string) =>
    text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
      const value = values[key];
      if (value === undefined || value.trim() === "") {
        if (!missing.includes(key)) missing.push(key);
        return whole;
      }
      return value.trim();
    });
  return { subject: put(template.subject), body: put(template.body), missing };
}

/**
 * Whether a template may be saved at all, said in words a person can act on.
 *
 * An email with no subject is refused because Outlook shows "(no subject)" to
 * the client. A WhatsApp template is refused a subject because there is nowhere
 * to put one, and a subject typed there would simply be lost.
 */
export function problemWith(template: Pick<OpsTemplate, "channel" | "subject" | "body" | "name">): string | null {
  if (!template.name.trim()) return "Give it a name, so it can be found in the list.";
  if (!template.body.trim()) return "There is nothing to send: the message is empty.";
  if (template.channel === "email" && !template.subject.trim()) {
    return "An email needs a subject. Without one the client sees “(no subject)”.";
  }
  if (template.channel !== "email" && template.subject.trim()) {
    return "Only an email has a subject. Put this wording in the message itself.";
  }
  // A hole nobody can fill is a typo that would block every send from this
  // template, so it is caught while it is still being written.
  const unknown = holesNeeded(template).filter((h) => !KNOWN_HOLES.includes(h));
  if (unknown.length) {
    return "We have nothing to put in " + unknown.map((h) => "{{" + h + "}}").join(", ") + ".";
  }
  return null;
}

/**
 * The holes we can fill, and what each one means. Kept here rather than in a
 * document so the screen can show a person the list while they write, and so a
 * typo in a hole is caught at once.
 *
 * It grows one phase at a time: the agreement's own fields arrive with Phase 2,
 * the set's with Phase 4.
 */
export const HOLE_MEANINGS: Record<string, string> = {
  client: "The client company's name",
  contact: "The person we are writing to",
  position: "The role being filled",
  opsPerson: "Whoever is sending it",
  opsEmail: "Their email address",
  days: "How many days it has been",
  date: "The date in question",
  setNumber: "Which set this is",
  cvCount: "How many CVs are in it",
  taskTitle: "What the task says",
  dueWhen: "When it is due, in words",
};

export const KNOWN_HOLES = Object.keys(HOLE_MEANINGS);

/**
 * Whether this wording may go out by itself.
 *
 * The owner's rule, kept as code rather than as a note: routine notices from
 * approved wording go automatically; anything else waits for a person. An
 * internal notice to our own people is never a client message, so it is always
 * allowed to go by itself.
 */
export function mayGoWithoutAPerson(template: Pick<OpsTemplate, "channel" | "approvedForAuto">): boolean {
  if (template.channel === "internal") return true;
  return template.approvedForAuto;
}
