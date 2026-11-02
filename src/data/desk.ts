import "server-only";

import { convexMutation, convexQuery, usingConvex } from "./convexClient";
import { repo } from "./store";
import { seed } from "./seed";
import type { Id, OpsDatabase, OpsMessage, OpsTask, OpsTimer } from "./types";
import { escalationFor } from "@/lib/escalation";
import { cancelledByReply } from "@/lib/timers";
import { tick } from "@/lib/tick";

/**
 * The desk, from wherever it is kept (2 Nov).
 *
 * One API for the screens, two places behind it: the JSON file that the tests
 * and the screens-only run use, and the Ops Convex backend. The records are the
 * same shape in both, so a page never knows or cares which it is reading — the
 * TA System's own arrangement, and the reason its screens could be built before
 * its backend existed.
 *
 * The rules stay in `src/lib`: this only reads and writes.
 */

export async function desk(): Promise<OpsDatabase> {
  if (!usingConvex()) return repo.all();

  const snapshot = await convexQuery<OpsDatabase>("ops/data:snapshot");
  // A brand new backend has nobody and no numbers, which would show an empty
  // screen with no way to fix it. The preview holds invented data by decision,
  // so the sample desk is put in once and never overwritten.
  if (snapshot.settings.length === 0) {
    const sample = seed();
    // The sample refers to people by id; the backend makes its own, so the
    // clocks and tasks name the role they belong to and it joins them up.
    const roleOf = (memberId: string) => sample.members.find((m) => m.id === memberId)?.role ?? "ops_owner";
    await convexMutation("ops/data:seed", {
      members: sample.members.map(({ name, email, role, active, taUserId }) => ({ name, email, role, active, taUserId })),
      settings: sample.settings.map(({ key, value }) => ({ key, value })),
      holidays: sample.holidays,
      timers: sample.timers.map(({ id, ownerId, ...rest }) => ({ ...rest, ownerRole: roleOf(ownerId) })),
      tasks: sample.tasks.map(({ kind, title, body, assigneeId, dueAt, subjectType, subjectId, createdAt }) => ({
        kind,
        title,
        body,
        ownerRole: roleOf(assigneeId),
        dueAt,
        subjectType,
        subjectId,
        createdAt,
      })),
      messages: sample.messages.map(({ channel, to, subject, body, templateKey, subjectType, subjectId, createdAt }) => ({
        channel,
        to,
        subject,
        body,
        templateKey,
        subjectType,
        subjectId,
        createdAt,
      })),
    });
    return convexQuery<OpsDatabase>("ops/data:snapshot");
  }
  return snapshot;
}

export async function startTimer(input: Omit<OpsTimer, "id" | "state" | "firedAt">): Promise<void> {
  if (!usingConvex()) {
    repo.startTimer(input);
    return;
  }
  await convexMutation("ops/data:startTimer", { ...input });
}

export async function finishTask(taskId: Id, by: Id, outcome: string): Promise<void> {
  if (!usingConvex()) {
    repo.finishTask(taskId, by, outcome);
    return;
  }
  await convexMutation("ops/data:finishTask", { taskId, by, outcome });
}

export async function editMessage(messageId: Id, patch: Pick<OpsMessage, "subject" | "body">, by: Id): Promise<void> {
  if (!usingConvex()) {
    repo.editMessage(messageId, patch, by);
    return;
  }
  await convexMutation("ops/data:editMessage", { messageId, subject: patch.subject, body: patch.body, by });
}

export async function settleMessage(
  messageId: Id,
  by: Id,
  state: Extract<OpsMessage["state"], "sent" | "failed" | "blocked" | "queued">,
  to: string[],
  note: string | null,
): Promise<void> {
  if (!usingConvex()) {
    repo.settleMessage(messageId, by, state, to, note);
    return;
  }
  await convexMutation("ops/data:settleMessage", { messageId, by, state, to, note });
}

export async function setSetting(key: string, value: string | number | boolean, by: Id, reason: string): Promise<void> {
  if (!usingConvex()) {
    repo.setSetting(key, value, by, reason);
    return;
  }
  await convexMutation("ops/data:setSetting", { key, value, by, reason });
}

/**
 * One pass of the clocks. The decisions are made here, by the same rules the
 * tests cover, and the backend only applies them — so what fires on the laptop
 * and what fires on the server cannot drift apart.
 */
export async function runClocks(now = Date.now()): Promise<{ warned: number; fired: number; escalated: number }> {
  if (!usingConvex()) return repo.runClocks(now);

  const db = await convexQuery<OpsDatabase>("ops/data:snapshot");
  if (!db.settings.some((s) => s.key === "switch.timersEnabled" && s.value === true)) {
    return { warned: 0, fired: 0, escalated: 0 };
  }

  const actions = tick(db.timers, now);
  const rules = {
    leadAfterHours: numberOf(db, "escalation.leadAfterHours", 24),
    directorAfterHours: numberOf(db, "escalation.directorAfterHours", 72),
  };
  const escalations = db.tasks
    .map((task) => {
      const move = escalationFor(task, db.members, rules, now);
      return move ? { taskId: task.id, toMemberId: move.toMemberId, note: move.note } : null;
    })
    .filter((x): x is { taskId: string; toMemberId: string; note: string } => x !== null);

  if (!actions.length && !escalations.length) return { warned: 0, fired: 0, escalated: 0 };

  return convexMutation<{ warned: number; fired: number; escalated: number }>("ops/data:applyTick", {
    warned: actions.filter((a) => a.state === "warned").map((a) => a.timerId),
    fired: actions.filter((a) => a.state === "fired").map((a) => a.timerId),
    firedAt: now,
    tasks: actions.map((a) => a.task).filter((t): t is NonNullable<typeof t> => t !== null),
    escalations,
  });
}

/** The client answered, so every chase for that subject stops. */
export async function recordReply(subjectType: string, subjectId: Id, by: Id): Promise<number> {
  if (!usingConvex()) return repo.recordReply(subjectType, subjectId, by);

  const db = await convexQuery<OpsDatabase>("ops/data:snapshot");
  const stopping = cancelledByReply(db.timers, subjectType, subjectId);
  if (!stopping.length) return 0;
  await convexMutation("ops/data:cancelTimers", { timerIds: stopping.map((t) => t.id), by });
  return stopping.length;
}

/* ── Reading one desk, without asking for it twice ───────────────────────── */

export function numberOf(db: OpsDatabase, key: string, fallback: number): number {
  const value = db.settings.find((s) => s.key === key)?.value;
  return typeof value === "number" ? value : fallback;
}

export function switchedOn(db: OpsDatabase, key: string): boolean {
  return db.settings.find((s) => s.key === key)?.value === true;
}

export function member(db: OpsDatabase, memberId: Id) {
  return db.members.find((m) => m.id === memberId) ?? null;
}

export function activeMembers(db: OpsDatabase) {
  return db.members.filter((m) => m.active);
}

export function draftsWaiting(db: OpsDatabase): OpsMessage[] {
  return db.messages.filter((m) => m.state === "draft").sort((a, b) => a.createdAt - b.createdAt);
}

export function openTasksFor(db: OpsDatabase, memberId: Id): OpsTask[] {
  return db.tasks.filter((t) => t.state === "open" && t.assigneeId === memberId).sort((a, b) => a.dueAt - b.dueAt);
}

export function liveTimersFor(db: OpsDatabase, memberId: Id): OpsTimer[] {
  return db.timers
    .filter((t) => (t.state === "running" || t.state === "warned") && t.ownerId === memberId)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function liveTimers(db: OpsDatabase): OpsTimer[] {
  return db.timers.filter((t) => t.state === "running" || t.state === "warned");
}
