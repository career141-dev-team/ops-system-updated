import "server-only";

import { convexMutation, convexQuery, usingConvex } from "./convexClient";
import { repo } from "./store";
import { seed } from "./seed";
import type { Id, OpsDatabase, OpsInbound, OpsMessage, OpsTask, OpsTimer } from "./types";
import { escalationFor } from "@/lib/escalation";
import { cancelledByReply } from "@/lib/timers";
import { tick } from "@/lib/tick";
import { type InboundMail, readAllMailboxes } from "@/lib/graphMail";
import { matchInbound, stopsChasing } from "@/lib/mailMatch";

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
  /** What the mail server called it, once a sender knows. */
  providerMessageId?: string | null,
): Promise<void> {
  if (!usingConvex()) {
    repo.settleMessage(messageId, by, state, to, note, providerMessageId);
    return;
  }
  await convexMutation("ops/data:settleMessage", { messageId, by, state, to, note, providerMessageId });
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

/**
 * One pass of the Ops mailbox (15, Phase 1 steps 18 and 19).
 *
 * Read, match, record, and stop the chasing for anything that was certainly a
 * reply. Everything it cannot place waits in "needs filing" rather than being
 * guessed at. Recording is keyed on the mail server's own id, so a second pass
 * over the same mailbox records nothing twice.
 */
export async function readTheMailboxes(
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; reason?: string; read: number; filed: number; waiting: number; chasesStopped: number }> {
  // Each box carries on from the newest thing we already have from it, so a
  // pass never re-reads and never skips. A box we have never read starts from
  // the reader's own short window.
  const since: Record<string, number> = {};
  for (const i of (await desk()).inbound) {
    if (i.mailbox && i.receivedAt > (since[i.mailbox] ?? 0)) since[i.mailbox] = i.receivedAt + 1000;
  }
  const { mail, problems } = await readAllMailboxes(since);
  const taken = await takeInbound(mail, by, now);
  // Some boxes may be readable and others not; say so rather than claiming
  // either a clean run or a total failure.
  return { ...taken, ok: problems.length === 0, reason: problems.join(" ") || undefined };
}

/** The same pass over mail from anywhere, so it can be tested and demonstrated. */
export async function takeInbound(
  mail: InboundMail[],
  by: Id,
  now = Date.now(),
): Promise<{ ok: boolean; read: number; filed: number; waiting: number; chasesStopped: number }> {
  const db = await desk();
  const known = {
    // Only messages whose real server id we kept. This used to make the id up
    // from our own row id, which no mail server has ever heard of, so the rule
    // could never match a single real reply (2 Nov).
    threads: db.messages
      .filter((m) => m.subjectType && m.subjectId && m.providerMessageId)
      .map((m) => ({
        providerMessageId: m.providerMessageId as string,
        subjectType: m.subjectType as string,
        subjectId: m.subjectId as string,
      })),
    // Client contacts come from the TA System once that window opens; until
    // then nothing is matched by domain, which is the safe way round.
    contacts: [] as { email: string; clientId: string }[],
    // One entry per thing we have written about, keeping the subject line we
    // used, so a reply carrying the house form "CLIENT > ROLE > SET n" can be
    // read against it. The newest message for a thing wins, since that is the
    // wording the client is looking at.
    subjects: [
      ...new Map(
        db.messages
          .filter((m) => m.subjectType && m.subjectId)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((m) => [
            (m.subjectType as string) + "|" + (m.subjectId as string),
            {
              subjectType: (m.subjectType as string).toLowerCase(),
              subjectId: m.subjectId as string,
              subject: m.subject,
            },
          ]),
      ).values(),
    ],
  };

  let filed = 0;
  let waiting = 0;
  let chasesStopped = 0;

  for (const item of mail) {
    const match = matchInbound(item, known);
    const row = {
      channel: "email" as const,
      mailbox: item.mailbox,
      from: item.from,
      fromName: item.fromName,
      receivedAt: item.receivedAt,
      subject: item.subject,
      body: item.body,
      providerId: item.providerId,
      inReplyTo: item.inReplyTo,
      matchedBy: match.method,
      subjectType: match.subjectType,
      subjectId: match.subjectId,
      clientId: match.clientId,
      note: match.note,
    };

    const saved = usingConvex()
      ? await convexMutation<{ id: string; already: boolean }>("ops/data:recordInbound", row)
      : repo.recordInbound(row);
    if (saved.already) continue;

    if (match.subjectId) filed += 1;
    else waiting += 1;

    if (stopsChasing(match) && match.subjectType && match.subjectId) {
      chasesStopped += await recordReply(match.subjectType, match.subjectId, by);
    }
  }

  return { ok: true, read: mail.length, filed, waiting, chasesStopped };
}

export async function fileInbound(inboundId: Id, subjectType: string, subjectId: Id, by: Id): Promise<number> {
  if (usingConvex()) {
    await convexMutation("ops/data:fileInbound", { inboundId, subjectType, subjectId, by });
  } else {
    repo.fileInbound(inboundId, subjectType, subjectId, by);
  }
  // Filing it by hand is still the client answering, so the chasing stops.
  return recordReply(subjectType, subjectId, by);
}

export async function markInboundActioned(inboundId: Id, by: Id): Promise<void> {
  if (usingConvex()) {
    await convexMutation("ops/data:markInboundActioned", { inboundId, by });
    return;
  }
  repo.markInboundActioned(inboundId, by);
}

export function inboundWaiting(db: OpsDatabase): OpsInbound[] {
  return db.inbound.filter((i) => i.readState === "new").sort((a, b) => b.receivedAt - a.receivedAt);
}

export function inboundRecent(db: OpsDatabase): OpsInbound[] {
  return [...db.inbound].sort((a, b) => b.receivedAt - a.receivedAt).slice(0, 20);
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
