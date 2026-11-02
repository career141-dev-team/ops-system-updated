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
 */
const CHASE_KINDS = ["esa.chase", "feedback.chase", "invoice.chase", "slots.chase", "interview.report"];

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
