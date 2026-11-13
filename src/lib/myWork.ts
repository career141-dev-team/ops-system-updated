/**
 * The words on My Work (13 Nov, the approved Figma "MW · My Work — one thing
 * at a time").
 *
 * The page is one card and a short list, so the words carry it: a greeting
 * for the hour in Colombo, one sentence that says how much and how bad, a
 * count of what is done, and one short label at the end of every row. All of
 * it is here, pure, so the screen only lays it out.
 */

import { colomboHour, colomboDate } from "./calendar";
import type { DayItem } from "./whatFirst";

/** "Good morning" before noon, "Good afternoon" before five, then evening - in Colombo. */
export function greetingFor(at: number): string {
  const hour = colomboHour(at);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Wednesday, 12 November", in Colombo. */
export function dayInWords(at: number): string {
  const d = new Date(at + 5.5 * 3_600_000);
  return DAYS[d.getUTCDay()] + ", " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

/** "Rushda" from "Rushda Shareef": what a greeting calls a person. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** A count as the design says it: "Six", and a number past twelve. */
export function countInWords(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * "Six things today. Two can't wait."
 *
 * Urgent is what is already late: the one thing the design singles out. A
 * clear day says so rather than "No things today".
 */
export function summaryLine(total: number, urgent: number): string {
  if (total === 0) return "Nothing is waiting on you. The day is clear.";
  const things = countInWords(total) + (total === 1 ? " thing today." : " things today.");
  if (urgent === 0) return things + " Nothing is late.";
  if (urgent === total && total > 1) return things + " All of them are late.";
  return things + " " + countInWords(urgent) + " can't wait.";
}

/** Tasks this person finished today, in Colombo: the "done" of "0 of 6 done". */
export function doneToday(
  tasks: { state: string; doneBy: string | null; doneAt: number | null }[],
  memberId: string,
  now: number,
): number {
  const today = colomboDate(now);
  return tasks.filter((t) => t.state === "done" && t.doneBy === memberId && t.doneAt !== null && colomboDate(t.doneAt) === today).length;
}

/** How late, the way the design writes it: "A day late", "3h late", "20 min late". */
export function lateInWords(at: number, now: number): string {
  const ms = Math.max(0, now - at);
  const days = Math.floor(ms / 86_400_000);
  if (days === 1) return "A day late";
  if (days > 1) return days + " days late";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return hours + "h late";
  return Math.max(1, Math.floor(ms / 60_000)) + " min late";
}

/** "09:00", in Colombo. */
function clock(at: number): string {
  return new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);
}

/**
 * The short label at the end of a row: how late, what to do, or when.
 * `late` says whether it is the red kind.
 */
export function rowLabel(item: DayItem, now: number): { text: string; late: boolean } {
  switch (item.kind) {
    case "late":
      return { text: lateInWords(item.at, now), late: true };
    case "draft":
    case "routine":
      return { text: "Approve", late: false };
    case "mail":
      return { text: "Reply", late: false };
    case "due":
      return { text: colomboDate(item.at) === colomboDate(now) ? "Today" : "Tomorrow " + clock(item.at), late: false };
    case "clock":
      return item.at < now ? { text: lateInWords(item.at, now), late: true } : { text: clock(item.at), late: false };
  }
}

/** Which of the design's four small pictures a row gets. */
export function rowIcon(item: DayItem): "file" | "mail" | "calendar" | "user" {
  if (item.kind === "draft" || item.kind === "routine" || item.kind === "mail") return "mail";
  if (item.kind === "due" || item.kind === "clock") return "calendar";
  return "file";
}

/** The day's items with the ones put off for later moved to the end, in order. */
export function laterLast(items: DayItem[], skipped: string[]): DayItem[] {
  const later = new Set(skipped);
  return [...items.filter((i) => !later.has(i.href)), ...items.filter((i) => later.has(i.href))];
}
