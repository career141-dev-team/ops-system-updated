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
 * never quietly lost. Moving a late task to today needs no reason: the
 * deadline has gone already and the task stays in the day.
 */

import { COLOMBO_OFFSET_MS, DAY, HOUR } from "./calendar";
import { dayBounds, isSystemTask } from "./myWorkView";

/** 17:00 Colombo today, or tomorrow's once today's has gone: the "end of the working day" due time. */
export function endOfWorkDay(now: number): number {
  const five = dayBounds(now).start + 17 * HOUR;
  return five > now ? five : five + DAY;
}

/** The instant a "Move to" choice means, or null when the date is not a real one. A filled date wins over the select. */
export function moveTarget(to: string, date: string, now: number): number | null {
  const { start, end } = dayBounds(now);
  let choice = date.trim() ? "date" : to;
  let at = 0;
  if (choice === "date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    if (!m) return null;
    at = Date.UTC(+m[1], +m[2] - 1, +m[3], 9) - COLOMBO_OFFSET_MS;
    const back = new Date(at + COLOMBO_OFFSET_MS); // 31 Feb and month 13 do not survive the round trip
    if (back.getUTCMonth() !== +m[2] - 1 || back.getUTCDate() !== +m[3]) return null;
    if (at >= start && at < end) choice = "today"; // today's date is the Today choice
  }
  if (choice === "today") {
    const five = start + 17 * HOUR;
    return five > now ? five : Math.min(now + HOUR, end - 1); // never before now, never tomorrow
  }
  if (choice === "tomorrow") return end + 9 * HOUR;
  return choice === "date" ? at : null;
}

/** Who may move it: the person who may do tasks, and only another person's with the reassign right. */
export function problemWithMover(task: { assigneeId: string }, memberId: string, canDo: boolean, canReassign: boolean): string | null {
  if (!canDo) return "Not allowed: you cannot change tasks.";
  if (task.assigneeId !== memberId && !canReassign) return "That task is someone else's.";
  return null;
}

/** What is wrong with the move, in a sentence, or null when it can go ahead. */
export function problemWithMove(task: { dueAt: number; subjectType: string | null }, target: number | null, reason: string, now: number): string | null {
  const { start, end } = dayBounds(now);
  if (target === null) return "Pick a day to move it to.";
  if (target < start) return "Pick today or a later day.";
  if (target > now + 366 * DAY) return "Pick a day within the next year.";
  if (isSystemTask(task) && target > task.dueAt && target >= end && !reason.trim()) return "Say why it is moving later than its deadline.";
  return null;
}
