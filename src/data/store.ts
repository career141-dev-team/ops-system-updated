/**
 * The store, the way the TA System does it (2 Nov).
 *
 * One interface, two modes. `json` keeps everything in a file under
 * OPS_DATA_DIR and is what the screens and the tests run against, so a screen
 * can be built and proved before the backend exists. `convex` will put the same
 * calls on the Ops Convex backend; the shape of the records is identical, so
 * nothing above this file changes when it is switched.
 *
 * It is deliberately small. Business rules live in `src/lib/*`, which is where
 * they are tested; this only reads and writes.
 */

import fs from "node:fs";
import path from "node:path";

import type {
  Id,
  OpsAuditEntry,
  OpsDatabase,
  OpsInbound,
  OpsMember,
  OpsMessage,
  OpsSetting,
  OpsTask,
  OpsTimer,
} from "./types";
import { seed } from "./seed";
import { tick } from "@/lib/tick";
import { escalationFor } from "@/lib/escalation";
import { cancelledByReply } from "@/lib/timers";

const dir = process.env.OPS_DATA_DIR || path.join(process.cwd(), ".data");
const file = path.join(dir, "ops.json");

let cache: OpsDatabase | null = null;

function load(): OpsDatabase {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(file, "utf8")) as OpsDatabase;
  } catch {
    cache = seed();
    save();
  }
  return cache as OpsDatabase;
}

function save(): void {
  if (!cache) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2));
}

function id(prefix: string): Id {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

/** Every write records who, what, before, after and why (15, Phase 1 step 6). */
function audit(entry: Omit<OpsAuditEntry, "id" | "at">): void {
  const db = load();
  db.audit.push({ ...entry, id: id("au"), at: Date.now() });
}

export const repo = {
  /** Throws away the file and starts again from the sample data. Tests use it. */
  reset(): void {
    cache = seed();
    save();
  },

  /** The whole desk, for the screens to read through `src/data/desk.ts`. */
  all(): OpsDatabase {
    return load();
  },

  members(): OpsMember[] {
    return load().members.filter((m) => m.active);
  },

  member(memberId: Id): OpsMember | null {
    return load().members.find((m) => m.id === memberId) ?? null;
  },

  settings(): OpsSetting[] {
    return [...load().settings].sort((a, b) => a.key.localeCompare(b.key));
  },

  setting(key: string): OpsSetting | null {
    return load().settings.find((s) => s.key === key) ?? null;
  },

  setSetting(key: string, value: string | number | boolean, by: Id, reason: string): void {
    const db = load();
    const row = db.settings.find((s) => s.key === key);
    const before = row ? String(row.value) : null;
    if (row) {
      row.value = value;
      row.updatedBy = by;
      row.updatedAt = Date.now();
    } else {
      db.settings.push({ key, value, updatedBy: by, updatedAt: Date.now() });
    }
    audit({ actorId: by, action: "setting.changed", subjectType: "setting", subjectId: key, before, after: String(value), reason });
    save();
  },

  holidays(): string[] {
    return load().holidays.map((h) => h.date);
  },

  timers(): OpsTimer[] {
    return load().timers;
  },

  liveTimers(): OpsTimer[] {
    return load().timers.filter((t) => t.state === "running" || t.state === "warned");
  },

  startTimer(input: Omit<OpsTimer, "id" | "state" | "firedAt">): OpsTimer {
    const db = load();
    const timer: OpsTimer = { ...input, id: id("t"), state: "running", firedAt: null };
    db.timers.push(timer);
    audit({ actorId: input.ownerId, action: "timer.started", subjectType: "timer", subjectId: timer.id, before: null, after: timer.kind, reason: null });
    save();
    return timer;
  },

  markTimer(timerId: Id, state: OpsTimer["state"], firedAt: number | null = null): void {
    const db = load();
    const timer = db.timers.find((t) => t.id === timerId);
    if (!timer) return;
    const before = timer.state;
    timer.state = state;
    if (firedAt !== null) timer.firedAt = firedAt;
    audit({ actorId: null, action: "timer." + state, subjectType: "timer", subjectId: timerId, before, after: state, reason: null });
    save();
  },

  tasks(): OpsTask[] {
    return load().tasks;
  },

  openTasksFor(memberId: Id): OpsTask[] {
    return load()
      .tasks.filter((t) => t.state === "open" && t.assigneeId === memberId)
      .sort((a, b) => a.dueAt - b.dueAt);
  },

  task(taskId: Id): OpsTask | null {
    return load().tasks.find((t) => t.id === taskId) ?? null;
  },

  createTask(input: Omit<OpsTask, "id" | "state" | "outcome" | "doneBy" | "doneAt" | "createdAt">): OpsTask {
    const db = load();
    const task: OpsTask = {
      ...input,
      id: id("k"),
      state: "open",
      outcome: null,
      doneBy: null,
      doneAt: null,
      createdAt: Date.now(),
    };
    db.tasks.push(task);
    audit({ actorId: null, action: "task.created", subjectType: "task", subjectId: task.id, before: null, after: task.title, reason: null });
    save();
    return task;
  },

  finishTask(taskId: Id, by: Id, outcome: string): void {
    const db = load();
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.state = "done";
    task.outcome = outcome.trim() || null;
    task.doneBy = by;
    task.doneAt = Date.now();
    audit({ actorId: by, action: "task.done", subjectType: "task", subjectId: taskId, before: "open", after: "done", reason: outcome.trim() || null });
    save();
  },

  messages(): OpsMessage[] {
    return load().messages;
  },

  draftsWaiting(): OpsMessage[] {
    return load()
      .messages.filter((m) => m.state === "draft")
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  message(messageId: Id): OpsMessage | null {
    return load().messages.find((m) => m.id === messageId) ?? null;
  },

  editMessage(messageId: Id, patch: Pick<OpsMessage, "subject" | "body">, by: Id): void {
    const db = load();
    const message = db.messages.find((m) => m.id === messageId);
    if (!message || message.state !== "draft") return;
    const before = message.subject + " / " + message.body.slice(0, 80);
    message.subject = patch.subject;
    message.body = patch.body;
    audit({ actorId: by, action: "message.edited", subjectType: "message", subjectId: messageId, before, after: patch.subject, reason: null });
    save();
  },

  /** Approval and the gate's verdict in one write, so neither can happen alone. */
  settleMessage(
    messageId: Id,
    by: Id,
    state: OpsMessage["state"],
    to: string[],
    note: string | null,
    providerMessageId?: string | null,
  ): void {
    const db = load();
    const message = db.messages.find((m) => m.id === messageId);
    if (!message) return;
    const before = message.state;
    message.approvedBy = by;
    message.approvedAt = Date.now();
    message.state = state;
    message.note = note;
    message.to = to;
    if (state === "sent") message.sentAt = Date.now();
    if (providerMessageId !== undefined) message.providerMessageId = providerMessageId;
    audit({ actorId: by, action: "message." + state, subjectType: "message", subjectId: messageId, before, after: state, reason: note });
    save();
  },

  /** A setting as a number, with the plan's value if somebody deleted the row. */
  number(key: string, fallback: number): number {
    const value = load().settings.find((s) => s.key === key)?.value;
    return typeof value === "number" ? value : fallback;
  },

  switchedOn(key: string): boolean {
    return load().settings.find((s) => s.key === key)?.value === true;
  },

  /**
   * One pass of the clocks (15, Phase 1 steps 13 and 15).
   *
   * Clocks warn, then fire and leave a task. Open tasks that nobody has done
   * move up the ladder. The whole point is that neither depends on a person
   * remembering, so this runs on every visit to the inbox and can also be
   * pressed by hand while we are building.
   */
  runClocks(now = Date.now()): { warned: number; fired: number; escalated: number } {
    const db = load();
    if (!db.settings.some((s) => s.key === "switch.timersEnabled" && s.value === true)) {
      return { warned: 0, fired: 0, escalated: 0 };
    }

    let warned = 0;
    let fired = 0;
    for (const action of tick(db.timers, now)) {
      const timer = db.timers.find((t) => t.id === action.timerId);
      if (!timer) continue;
      timer.state = action.state;
      if (action.state === "warned") {
        warned += 1;
        continue;
      }
      fired += 1;
      timer.firedAt = now;
      if (action.task) {
        repo.createTask({ ...action.task, dueAt: now });
      }
      audit({ actorId: null, action: "timer.fired", subjectType: "timer", subjectId: timer.id, before: "running", after: "fired", reason: null });
    }

    const rules = {
      leadAfterHours: repo.number("escalation.leadAfterHours", 24),
      directorAfterHours: repo.number("escalation.directorAfterHours", 72),
    };
    let escalated = 0;
    for (const task of db.tasks) {
      const move = escalationFor(task, db.members, rules, now);
      if (!move) continue;
      const before = task.assigneeId;
      task.assigneeId = move.toMemberId;
      task.body = task.body + "\n\nPassed on: " + move.note;
      escalated += 1;
      audit({ actorId: null, action: "task.escalated", subjectType: "task", subjectId: task.id, before, after: move.toMemberId, reason: move.note });
    }

    if (warned || fired || escalated) save();
    return { warned, fired, escalated };
  },

  /**
   * The client answered. Every chase for that subject stops at once, which is
   * what stops a client who has replied being chased again (15, step 17).
   * Clocks that measure something real are left running.
   */
  recordReply(subjectType: string, subjectId: Id, by: Id): number {
    const db = load();
    const stopped = cancelledByReply(db.timers, subjectType, subjectId);
    for (const timer of stopped) {
      timer.state = "cancelled";
      audit({ actorId: by, action: "timer.cancelled", subjectType: "timer", subjectId: timer.id, before: "running", after: "cancelled", reason: "The client replied." });
    }
    if (stopped.length) save();
    return stopped.length;
  },

  /**
   * One arrival. The mail server's own id is the key: a second pass over the
   * same mailbox must never record the same email twice, which is the bug the
   * TA System fixed by hand after a candidate was answered twice (2 Oct).
   */
  recordInbound(mail: Omit<OpsInbound, "id" | "readState">): { id: Id; already: boolean } {
    const db = load();
    const seen = db.inbound.find((i) => i.providerId === mail.providerId);
    if (seen) return { id: seen.id, already: true };
    const row: OpsInbound = { ...mail, id: id("in"), readState: mail.subjectId ? "filed" : "new" };
    db.inbound.push(row);
    audit({
      actorId: null,
      action: "inbound.recorded",
      subjectType: "inbound",
      subjectId: row.id,
      before: null,
      after: row.matchedBy,
      reason: row.note,
    });
    save();
    return { id: row.id, already: false };
  },

  /** A person says what it belongs to. */
  fileInbound(inboundId: Id, subjectType: string, subjectId: Id, by: Id): void {
    const db = load();
    const row = db.inbound.find((i) => i.id === inboundId);
    if (!row) return;
    const before = row.subjectId;
    row.subjectType = subjectType;
    row.subjectId = subjectId;
    row.matchedBy = "manual";
    row.readState = "filed";
    row.note = "Filed by hand.";
    audit({ actorId: by, action: "inbound.filed", subjectType: "inbound", subjectId: inboundId, before, after: subjectId, reason: null });
    save();
  },

  markInboundActioned(inboundId: Id, by: Id): void {
    const db = load();
    const row = db.inbound.find((i) => i.id === inboundId);
    if (!row) return;
    row.readState = "actioned";
    audit({ actorId: by, action: "inbound.actioned", subjectType: "inbound", subjectId: inboundId, before: "filed", after: "actioned", reason: null });
    save();
  },

  audit(): OpsAuditEntry[] {
    return [...load().audit].sort((a, b) => b.at - a.at);
  },
};
