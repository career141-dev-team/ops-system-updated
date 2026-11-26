/**
 * What a clock does, as pure rules (15, Phase 1 step 13).
 *
 * The engine that reads and writes rows is thin on purpose; everything that
 * could be wrong about a clock is decided here, where it is tested: when it
 * warns, when it fires, what it becomes, and that a reply cancels a chase.
 */

import type { OpsTimer, TimerState } from "@/data/types";

/** A clock that has passed its warn time but not yet its due time. */
export function shouldWarn(timer: Pick<OpsTimer, "state" | "warnAt" | "dueAt">, now: number): boolean {
  if (timer.state !== "running") return false;
  if (timer.warnAt === null) return false;
  return now >= timer.warnAt && now < timer.dueAt;
}

/** A clock that has passed its due time and has not fired yet. */
export function shouldFire(timer: Pick<OpsTimer, "state" | "dueAt">, now: number): boolean {
  if (timer.state !== "running" && timer.state !== "warned") return false;
  return now >= timer.dueAt;
}

/** The state after this tick, or null when nothing changes. */
export function nextState(timer: Pick<OpsTimer, "state" | "warnAt" | "dueAt">, now: number): TimerState | null {
  if (shouldFire(timer, now)) return "fired";
  if (shouldWarn(timer, now)) return "warned";
  return null;
}

/**
 * A client answered, so every clock chasing them stops (15, Phase 1 step 17).
 * Only the chases stop: a clock measuring something real, such as the CV
 * ownership window or the guarantee, keeps running whatever the client says.
 * `invoice.chase` is not here (26 Nov): the same clock adds the late charge and
 * asks about writing off, so a reply only skips its next draft (chaseThePayment).
 */
const CHASE_KINDS = ["esa.chase", "feedback.chase", "invoice.remind", "slots.chase", "interview.report"];

export function isChase(kind: string): boolean {
  return CHASE_KINDS.includes(kind);
}

export function cancelledByReply(timers: OpsTimer[], subjectType: string, subjectId: string): OpsTimer[] {
  return timers.filter(
    (t) =>
      (t.state === "running" || t.state === "warned") &&
      isChase(t.kind) &&
      t.subjectType === subjectType &&
      t.subjectId === subjectId,
  );
}

/** How much time is left, in words a person reads at a glance. */
export function timeLeft(dueAt: number, now: number): { text: string; tone: "calm" | "soon" | "late" } {
  const ms = dueAt - now;
  const mins = Math.round(Math.abs(ms) / 60_000);
  const hours = Math.round(Math.abs(ms) / 3_600_000);
  const days = Math.round(Math.abs(ms) / 86_400_000);
  const amount = days >= 2 ? days + " days" : hours >= 2 ? hours + " hours" : mins + " minutes";
  if (ms < 0) return { text: amount + " late", tone: "late" };
  if (ms <= 24 * 3_600_000) return { text: amount + " left", tone: "soon" };
  return { text: amount + " left", tone: "calm" };
}

/**
 * What a clock is, in words.
 *
 * The screens showed the kind as it is written in the code - "esa.send" - and
 * a person reading their own day should not have to translate (2 Nov).
 */
export function clockInWords(kind: string): string {
  const words: Record<string, string> = {
    "esa.send": "the agreement has to go out",
    "esa.chase": "chasing the agreement",
    "esa.decline": "two weeks with no signed agreement",
    "esa.countersign": "the Director has to countersign",
    "meeting.reminder.day": "a client meeting tomorrow",
    "meeting.reminder.hour": "a client meeting in an hour",
    "meeting.rebook": "a meeting to book again",
    "feedback.chase": "waiting on client feedback",
    "feedback.call": "a client to ring about feedback",
    "lead.inviteBack": "a client to invite back",
    "talentpulse.compile": "Talent Pulse, on Tuesday",
    "report.weekly": "the weekly report, on Monday",
    "ad.close": "a TopJobs advert to close",
    "interview.day": "the interview itself",
    "interview.report": "a date the client owes us",
    "slots.chase": "times the client owes us",
    "silence.hold": "two weeks of client silence",
    "hold.review": "a hold to look at again",
    "hire.unreported": "a possible unreported hire",
    "set.due": "a set due at the client",
    "set.ownership": "the CV ownership window",
    "invoice.chase": "an unpaid invoice",
    "invoice.remind": "an invoice payment reminder",
    "invoice.due": "an invoice due",
    "doj.remind.week": "somebody joining in a week",
    "doj.remind.day": "somebody joining tomorrow",
    "doj.join": "a joining day",
    "guarantee.warn": "the guarantee, fifteen days left",
    "guarantee.end": "the guarantee ends",
    "replacement.deadline": "the time to replace somebody",
    "interview.reconfirm": "an interview to reconfirm",
    "test.clock": "a test clock",
  };
  return words[kind] ?? kind;
}
