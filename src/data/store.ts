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
  OpsBaseline,
  OpsCallLog,
  OpsClient,
  OpsClientSet,
  OpsDatabase,
  OpsEsa,
  OpsEvent,
  OpsFile,
  OpsInbound,
  OpsLead,
  OpsMeeting,
  OpsOutboxItem,
  OpsTaCall,
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
    const onDisk = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<OpsDatabase>;
    // A file written before a collection existed has no key for it, and the
    // screens would then crash on an undefined list. Each phase adds tables, so
    // anything missing takes the sample's version rather than breaking the
    // desk (2 Nov, found when templates arrived).
    const fresh = seed();
    cache = { ...fresh, ...onDisk } as OpsDatabase;
    for (const key of Object.keys(fresh) as (keyof OpsDatabase)[]) {
      if (!Array.isArray(cache[key])) (cache as unknown as Record<string, unknown>)[key] = fresh[key];
    }
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

  /**
   * Remembers the last scheduled pass of the clocks.
   *
   * Deliberately not audited: a pass happens every five minutes, and an entry
   * each time would bury the ten changes a person actually wants to see on the
   * health screen. The pass itself audits anything it did.
   */
  noteClockPass(value: string): void {
    repo.noteSystemSetting("clock.lastPass", value);
  },

  /**
   * A setting the system keeps for itself: the last clock pass, the events
   * cursor. Not audited, for the same reason as the pass - these change every
   * few minutes and would bury the changes a person made.
   */
  noteSystemSetting(key: string, value: string): void {
    const db = load();
    const row = db.settings.find((s) => s.key === key);
    if (row) {
      row.value = value;
      row.updatedAt = Date.now();
    } else {
      db.settings.push({ key, value, updatedBy: null, updatedAt: Date.now() });
    }
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

  /**
   * Save a template's wording. Only the ops lead gets here (the screen checks
   * first), and the old wording is kept in the audit trail: "who changed the
   * chase email, and to what" is a question that gets asked.
   */
  saveTemplate(
    key: string,
    patch: { name: string; subject: string; body: string; approvedForAuto: boolean },
    by: Id,
  ): void {
    const db = load();
    const row = db.templates.find((t) => t.key === key);
    if (!row) return;
    const before = row.subject + " / " + row.body.slice(0, 120);
    row.name = patch.name;
    row.subject = patch.subject;
    row.body = patch.body;
    row.approvedForAuto = patch.approvedForAuto;
    row.updatedBy = by;
    row.updatedAt = Date.now();
    audit({
      actorId: by,
      action: "template.saved",
      subjectType: "template",
      subjectId: key,
      before,
      after: row.subject + " / " + row.body.slice(0, 120),
      reason: null,
    });
    save();
  },

  files(): OpsFile[] {
    return [...load().files].sort((a, b) => b.uploadedAt - a.uploadedAt);
  },

  file(fileId: Id): OpsFile | null {
    return load().files.find((f) => f.id === fileId) ?? null;
  },

  /**
   * Records a file that has already been written to R2 or to the folder.
   *
   * The row is written second on purpose: a row with no bytes behind it is a
   * broken link somebody will click a year from now, while bytes with no row
   * are only wasted space.
   */
  addFile(input: Omit<OpsFile, "id" | "uploadedAt">): OpsFile {
    const db = load();
    const row: OpsFile = { ...input, id: id("f"), uploadedAt: Date.now() };
    db.files.push(row);
    audit({
      actorId: input.uploadedBy,
      action: input.madeFrom ? "file.converted" : "file.kept",
      subjectType: "file",
      subjectId: row.id,
      before: null,
      after: row.kind + " · " + row.name,
      reason: null,
    });
    save();
    return row;
  },

  /* ── Leads: the front door ──────────────────────────────── */

  leads(): OpsLead[] {
    return [...load().leads].sort((a, b) => b.createdAt - a.createdAt);
  },

  lead(leadId: Id): OpsLead | null {
    return load().leads.find((l) => l.id === leadId) ?? null;
  },

  addLead(input: Omit<OpsLead, "id" | "createdAt" | "updatedAt">): OpsLead {
    const db = load();
    const now = Date.now();
    const row: OpsLead = { ...input, id: id("ld"), createdAt: now, updatedAt: now };
    db.leads.push(row);
    audit({
      actorId: input.createdBy,
      action: "lead.created",
      subjectType: "lead",
      subjectId: row.id,
      before: null,
      after: row.company + " · " + row.source,
      reason: null,
    });
    save();
    return row;
  },

  /**
   * Changes one lead, and records what changed and why.
   *
   * Every move a lead makes goes through here, so "who decided this company
   * was finance" and "why was this closed" always have an answer.
   */
  patchLead(leadId: Id, patch: Partial<OpsLead>, by: Id, what: string, reason: string | null = null): void {
    const db = load();
    const row = db.leads.find((l) => l.id === leadId);
    if (!row) return;
    const before = row.state;
    Object.assign(row, patch, { updatedAt: Date.now() });
    audit({
      actorId: by,
      action: what,
      subjectType: "lead",
      subjectId: row.id,
      before,
      after: row.state,
      reason,
    });
    save();
  },

  /* ── The client agreement ───────────────────────────────── */

  agreements(): OpsEsa[] {
    return [...load().agreements].sort((a, b) => b.updatedAt - a.updatedAt);
  },

  agreement(esaId: Id): OpsEsa | null {
    return load().agreements.find((e) => e.id === esaId) ?? null;
  },

  /* ── Clients (15, Phase 2 step 19) ─────────────────────── */

  clientIn(clientId: Id): OpsClient | null {
    return load().clients.find((c) => c.id === clientId) ?? null;
  },

  addClient(input: Omit<OpsClient, "id" | "createdAt" | "updatedAt">): OpsClient {
    const db = load();
    const now = Date.now();
    const row: OpsClient = { ...input, id: id("cl"), createdAt: now, updatedAt: now };
    db.clients.push(row);
    audit({
      actorId: input.ownerId,
      action: "client.created",
      subjectType: "client",
      subjectId: row.id,
      before: null,
      after: row.name + " · " + row.stage,
      reason: null,
    });
    save();
    return row;
  },

  patchClient(clientId: Id, patch: Partial<OpsClient>, by: Id, what: string, reason: string | null = null): void {
    const db = load();
    const row = db.clients.find((c) => c.id === clientId);
    if (!row) return;
    // An owner move is the one change where the stage is not the story.
    const before = row.stage;
    const wasOwner = row.ownerId;
    Object.assign(row, patch, { updatedAt: Date.now() });
    audit({
      actorId: by,
      action: what,
      subjectType: "client",
      subjectId: row.id,
      before: patch.ownerId ? wasOwner : before,
      after: patch.ownerId ? row.ownerId : row.stage,
      reason,
    });
    save();
  },

  /* ── Client sets (15, Phase 4) ──────────────────────────── */

  clientSetIn(setId: Id): OpsClientSet | null {
    return load().clientSets.find((r) => r.id === setId) ?? null;
  },

  addClientSet(input: Omit<OpsClientSet, "id" | "createdAt" | "updatedAt">): OpsClientSet {
    const db = load();
    const now = Date.now();
    const row: OpsClientSet = { ...input, id: id("set"), createdAt: now, updatedAt: now };
    db.clientSets.push(row);
    audit({
      actorId: null,
      action: "clientSet.ready",
      subjectType: "clientSet",
      subjectId: row.id,
      before: null,
      after: row.name,
      reason: null,
    });
    save();
    return row;
  },

  patchClientSet(setId: Id, patch: Partial<OpsClientSet>, by: Id | null, what: string, reason: string | null = null): void {
    const db = load();
    const row = db.clientSets.find((r) => r.id === setId);
    if (!row) return;
    const before = row.state;
    Object.assign(row, patch, { updatedAt: Date.now() });
    audit({ actorId: by, action: what, subjectType: "clientSet", subjectId: row.id, before, after: row.state, reason });
    save();
  },

  addAgreement(input: Omit<OpsEsa, "id" | "createdAt" | "updatedAt">): OpsEsa {
    const db = load();
    const now = Date.now();
    const row: OpsEsa = { ...input, id: id("esa"), createdAt: now, updatedAt: now };
    db.agreements.push(row);
    audit({
      actorId: input.ownerId,
      action: "esa.started",
      subjectType: "esa",
      subjectId: row.id,
      before: null,
      after: "version " + row.version,
      reason: null,
    });
    save();
    return row;
  },

  patchAgreement(esaId: Id, patch: Partial<OpsEsa>, by: Id, what: string, reason: string | null = null): void {
    const db = load();
    const row = db.agreements.find((e) => e.id === esaId);
    if (!row) return;
    const before = row.state;
    Object.assign(row, patch, { updatedAt: Date.now() });
    audit({ actorId: by, action: what, subjectType: "esa", subjectId: row.id, before, after: row.state, reason });
    save();
  },

  /**
   * Writes a message into the one way out (15, Phase 1 step 16).
   *
   * Every message starts here as a draft and leaves through the gate. Until
   * now the only drafts were the sample ones, because nothing in Phase 1
   * wrote to a client; the agreement is the first thing that does.
   */
  draftMessage(
    input: Omit<
      OpsMessage,
      "id" | "state" | "approvedBy" | "approvedAt" | "sentAt" | "providerMessageId" | "note" | "createdAt" | "attachmentFileIds"
    > & { attachmentFileIds?: Id[] },
  ): OpsMessage {
    const db = load();
    const row: OpsMessage = {
      ...input,
      attachmentFileIds: input.attachmentFileIds ?? [],
      id: id("msg"),
      state: "draft",
      approvedBy: null,
      approvedAt: null,
      sentAt: null,
      providerMessageId: null,
      note: null,
      createdAt: Date.now(),
    };
    db.messages.push(row);
    audit({
      actorId: null,
      action: "message.drafted",
      subjectType: "message",
      subjectId: row.id,
      before: null,
      after: row.channel + " to " + row.to.join(", "),
      reason: row.templateKey,
    });
    save();
    return row;
  },

  /* ── Meetings with a client ─────────────────────────────── */

  /** Stops named clocks, with the reason they stopped. */
  cancelTimers(timerIds: Id[], by: Id, reason: string): void {
    const db = load();
    let stopped = 0;
    for (const timerId of timerIds) {
      const timer = db.timers.find((t) => t.id === timerId);
      if (!timer || (timer.state !== "running" && timer.state !== "warned")) continue;
      timer.state = "cancelled";
      stopped += 1;
      audit({ actorId: by, action: "timer.cancelled", subjectType: "timer", subjectId: timer.id, before: "running", after: "cancelled", reason });
    }
    if (stopped) save();
  },

  meetings(): OpsMeeting[] {
    return [...load().meetings].sort((a, b) => b.at - a.at);
  },

  meeting(meetingId: Id): OpsMeeting | null {
    return load().meetings.find((m) => m.id === meetingId) ?? null;
  },

  addMeeting(input: Omit<OpsMeeting, "id" | "createdAt" | "updatedAt">): OpsMeeting {
    const db = load();
    const now = Date.now();
    const row: OpsMeeting = { ...input, id: id("mt"), createdAt: now, updatedAt: now };
    db.meetings.push(row);
    audit({
      actorId: input.bookedBy,
      action: "meeting.booked",
      subjectType: "meeting",
      subjectId: row.id,
      before: null,
      after: new Date(row.at).toISOString().slice(0, 16),
      reason: null,
    });
    save();
    return row;
  },

  patchMeeting(meetingId: Id, patch: Partial<OpsMeeting>, by: Id, what: string, reason: string | null = null): void {
    const db = load();
    const row = db.meetings.find((m) => m.id === meetingId);
    if (!row) return;
    const before = row.state;
    Object.assign(row, patch, { updatedAt: Date.now() });
    audit({
      actorId: by,
      action: what,
      subjectType: "meeting",
      subjectId: row.id,
      before,
      after: row.state,
      reason,
    });
    save();
  },

  /* ── Calls, by a person, never by the system ─────────────────────────── */

  calls(): OpsCallLog[] {
    return [...load().calls].sort((a, b) => b.at - a.at);
  },

  logCall(input: Omit<OpsCallLog, "id" | "at">): OpsCallLog {
    const db = load();
    const row: OpsCallLog = { ...input, id: id("c"), at: Date.now() };
    db.calls.push(row);
    audit({
      actorId: input.by,
      action: "call.logged",
      subjectType: "call",
      subjectId: row.id,
      before: null,
      after: input.to,
      reason: input.outcome,
    });
    save();
    return row;
  },

  /* ── Holidays: the days the office is shut ───────────────────────────── */

  holidayList(): { date: string; name: string }[] {
    return [...load().holidays].sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Adds days, skipping any already on the list. Returns how many were new. */
  addHolidays(days: { date: string; name: string }[], by: Id): number {
    const db = load();
    let added = 0;
    for (const day of days) {
      if (db.holidays.some((h) => h.date === day.date)) continue;
      db.holidays.push(day);
      added += 1;
    }
    if (added) {
      audit({ actorId: by, action: "holidays.added", subjectType: "holidays", subjectId: "list", before: null, after: String(added), reason: null });
      save();
    }
    return added;
  },

  removeHoliday(date: string, by: Id): boolean {
    const db = load();
    const at = db.holidays.findIndex((h) => h.date === date);
    if (at === -1) return false;
    db.holidays.splice(at, 1);
    audit({ actorId: by, action: "holiday.removed", subjectType: "holidays", subjectId: date, before: date, after: null, reason: null });
    save();
    return true;
  },

  /* ── The baseline: how bad it is today ──────────────────────────────── */

  baseline(): OpsBaseline[] {
    return [...load().baseline].sort((a, b) => b.at - a.at);
  },

  addBaseline(input: Omit<OpsBaseline, "id" | "at">): OpsBaseline {
    const db = load();
    const row: OpsBaseline = { ...input, id: id("b"), at: Date.now() };
    db.baseline.push(row);
    audit({ actorId: input.by, action: "baseline.recorded", subjectType: "baseline", subjectId: row.id, before: null, after: input.measure + " = " + input.value, reason: input.note || null });
    save();
    return row;
  },

  /* ── The window to the TA System ─────────────────────────────────────── */

  /**
   * Keeps the last hundred calls only. The screens ask "is it working now",
   * which the newest few answer; keeping every call would grow for ever and
   * tell nobody anything more.
   */
  logTaCall(input: Omit<OpsTaCall, "id" | "at">): void {
    const db = load();
    db.taCalls.push({ ...input, id: id("tc"), at: Date.now() });
    if (db.taCalls.length > 100) db.taCalls.splice(0, db.taCalls.length - 100);
    save();
  },

  taCalls(): OpsTaCall[] {
    return [...load().taCalls].sort((a, b) => b.at - a.at);
  },

  outbox(): OpsOutboxItem[] {
    return [...load().outbox].sort((a, b) => a.createdAt - b.createdAt);
  },

  queueWrite(input: Omit<OpsOutboxItem, "id" | "state" | "attempts" | "lastError" | "nextTryAt" | "createdAt" | "sentAt">): OpsOutboxItem {
    const db = load();
    // The same key twice is the same intention twice: the first row stands.
    const already = db.outbox.find((o) => o.idempotencyKey === input.idempotencyKey);
    if (already) return already;
    const row: OpsOutboxItem = {
      ...input,
      id: id("o"),
      state: "queued",
      attempts: 0,
      lastError: null,
      nextTryAt: null,
      createdAt: Date.now(),
      sentAt: null,
    };
    db.outbox.push(row);
    audit({ actorId: null, action: "outbox.queued", subjectType: "outbox", subjectId: row.id, before: null, after: input.path, reason: null });
    save();
    return row;
  },

  /** The result of one attempt. A write that is only waiting is not a failure. */
  recordOutboxTry(itemId: Id, result: { ok: boolean; error?: string; nextTryAt?: number | null; state?: OpsOutboxItem["state"] }): void {
    const db = load();
    const row = db.outbox.find((o) => o.id === itemId);
    if (!row) return;
    row.attempts += 1;
    if (result.ok) {
      row.state = "sent";
      row.sentAt = Date.now();
      row.lastError = null;
      row.nextTryAt = null;
    } else {
      row.state = result.state ?? "queued";
      row.lastError = result.error ?? "The TA System could not be reached.";
      row.nextTryAt = result.nextTryAt ?? null;
    }
    audit({
      actorId: null,
      action: result.ok ? "outbox.sent" : row.state === "failed" ? "outbox.givenUp" : "outbox.waiting",
      subjectType: "outbox",
      subjectId: row.id,
      before: row.path,
      after: String(row.attempts) + " tries",
      reason: row.lastError,
    });
    save();
  },

  events(): OpsEvent[] {
    return [...load().events].sort((a, b) => b.receivedAt - a.receivedAt);
  },

  /** Records an event once. The same TA event twice is kept once. */
  addEvent(input: Omit<OpsEvent, "id" | "receivedAt">): OpsEvent | null {
    const db = load();
    if (db.events.some((e) => e.taEventId === input.taEventId)) return null;
    const row: OpsEvent = { ...input, id: id("e"), receivedAt: Date.now() };
    db.events.push(row);
    save();
    return row;
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

  /**
   * Newest first, and two entries written in the same millisecond keep the
   * order they happened in. Without that tiebreak the newest entry of a pair
   * was whichever the sort happened to put first, which made the trail read
   * backwards now and then - and made one test fail about once in twenty runs
   * (2 Nov).
   */
  audit(): OpsAuditEntry[] {
    const all = load().audit;
    return all
      .map((entry, order) => ({ entry, order }))
      .sort((a, b) => b.entry.at - a.entry.at || b.order - a.order)
      .map(({ entry }) => entry);
  },
};
