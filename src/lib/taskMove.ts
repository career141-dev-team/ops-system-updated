/**
 * Moving a task to another day (22 Nov, ops-team feedback).
 *
 * "My Talent Pulse task is under Later - how can I change it to Today?" The
 * board only pushed tasks later. Pure rules here, so the action only reads
 * and writes.
 *
 * A free task (nothing attached) moves either way. A task the system made
 * for a deadline (it is about a report, a client, an agreement...) can always
 * be pulled earlier, but pushing it later needs a reason, so a deadline is
 * never quietly lost.
 */

import { DAY, HOUR } from "./calendar";

const OFFSET = 5.5 * HOUR; // Colombo, no daylight saving

/** The Colombo day's start. */
const dayStart = (at: number) => Math.floor((at + OFFSET) / DAY) * DAY - OFFSET;

/** 17:00 Colombo today, or tomorrow's once today's has gone: the "end of the working day" due time. */
export function endOfWorkDay(now: number): number {
  const five = dayStart(now) + 17 * HOUR;
  return five > now ? five : five + DAY;
}

/** The instant a "Move to" choice means, or null when the date is not a real one. */
export function moveTarget(to: string, date: string, now: number): number | null {
  const today = dayStart(now);
  if (to === "today") {
    const five = today + 17 * HOUR;
    return five > now ? five : Math.min(now + HOUR, today + DAY - 60_000);
  }
  if (to === "tomorrow") return today + DAY + 9 * HOUR;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const at = Date.UTC(+m[1], +m[2] - 1, +m[3], 9) - OFFSET;
  if (new Date(at + OFFSET).getUTCDate() !== +m[3]) return null; // 31 Feb and the like
  return at;
}

/** What is wrong with the move, in a sentence, or null when it can go ahead. */
export function problemWithMove(task: { dueAt: number; subjectType: string | null }, target: number | null, reason: string, now: number): string | null {
  if (target === null) return "Pick a day to move it to.";
  if (target < dayStart(now)) return "Pick today or a later day.";
  if (task.subjectType && target > task.dueAt && !reason.trim()) return "Say why it can wait: this task has a deadline.";
  return null;
}
