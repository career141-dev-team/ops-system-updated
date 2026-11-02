import { v } from "convex/values";

import { internalMutation, internalQuery, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { messageChannel, taskKind, timerState } from "../schema";

/**
 * The Ops backend, in one module (15, Phase 1).
 *
 * The app reads the whole desk in a single query and writes through named
 * mutations, which is the shape the data allows: these tables are small — the
 * people, the settings, the holidays, the live clocks, the open tasks and the
 * messages waiting. Reading them together is one round trip instead of seven,
 * and it keeps the app's store a thin thing over either this or the JSON file.
 *
 * Every write records who, what, before, after and why, because the rule the
 * owner set for the screens is the same rule underneath them.
 */

const AUDIT_SHOWN = 50;

function row<T extends { _id: unknown; _creationTime: number }>(doc: T): Omit<T, "_id" | "_creationTime"> & { id: string } {
  const { _id, _creationTime, ...rest } = doc;
  return { ...rest, id: _id as string };
}

async function writeAudit(
  ctx: MutationCtx,
  entry: {
    actorId: string | null;
    action: string;
    subjectType: string;
    subjectId: string;
    before?: string | null;
    after?: string | null;
    reason?: string | null;
  },
): Promise<void> {
  await ctx.db.insert("opsAudit", {
    actorId: entry.actorId,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
    at: Date.now(),
  });
}

/** Everything a screen needs, in one read. */
export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [members, settings, templates, holidays, timers, tasks, messages, inbound, files, audit] = await Promise.all([
      ctx.db.query("opsMembers").collect(),
      ctx.db.query("opsSettings").collect(),
      ctx.db.query("opsTemplates").collect(),
      ctx.db.query("opsHolidays").collect(),
      // Finished clocks are history; the screens only ever show the live ones
      // and the ones that fired today.
      ctx.db.query("opsTimers").collect(),
      ctx.db.query("opsTasks").collect(),
      ctx.db.query("opsMessages").collect(),
      ctx.db.query("opsInbound").withIndex("by_received").order("desc").take(100),
      // The newest 200 files: the registry grows for ever, the screen does not.
      ctx.db.query("opsFiles").withIndex("by_uploaded").order("desc").take(200),
      ctx.db.query("opsAudit").withIndex("by_at").order("desc").take(AUDIT_SHOWN),
    ]);

    return {
      members: members.map(row),
      settings: settings.map((s: Doc<"opsSettings">) => ({
        key: s.key,
        value: s.value,
        updatedBy: s.updatedBy,
        updatedAt: s.updatedAt,
      })),
      templates: templates.map(row),
      holidays: holidays.map((h: Doc<"opsHolidays">) => ({ date: h.date, name: h.name })),
      timers: timers.map(row),
      tasks: tasks.map(row),
      messages: messages.map(row),
      inbound: inbound.map(row),
      files: files.map(row),
      audit: audit.map(row),
    };
  },
});

/** True once the settings are in. Used to decide whether to seed. */
export const isSeeded = internalQuery({
  args: {},
  handler: async (ctx) => {
    const one = await ctx.db.query("opsSettings").first();
    return one !== null;
  },
});

/**
 * First run only: the people, the settings, the holidays. It refuses to run
 * twice, so it can never quietly overwrite a desk that is already working.
 */
export const seed = internalMutation({
  args: {
    members: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        role: v.union(
          v.literal("ops_owner"),
          v.literal("ops_lead"),
          v.literal("accounts"),
          v.literal("director_ops"),
          v.literal("marketing"),
          v.literal("director_ro"),
          v.literal("ta_lead_ro"),
        ),
        active: v.boolean(),
        taUserId: v.union(v.string(), v.null()),
      }),
    ),
    settings: v.array(v.object({ key: v.string(), value: v.union(v.string(), v.number(), v.boolean()) })),
    holidays: v.array(v.object({ date: v.string(), name: v.string() })),
    templates: v.array(
      v.object({
        key: v.string(),
        channel: messageChannel,
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        approvedForAuto: v.boolean(),
      }),
    ),
    timers: v.array(
      v.object({
        kind: v.string(),
        subjectType: v.string(),
        subjectId: v.string(),
        startsAt: v.number(),
        dueAt: v.number(),
        warnAt: v.union(v.number(), v.null()),
        state: timerState,
        firedAt: v.union(v.number(), v.null()),
        ownerRole: v.string(),
        payload: v.record(v.string(), v.string()),
      }),
    ),
    tasks: v.array(
      v.object({
        kind: taskKind,
        title: v.string(),
        body: v.string(),
        ownerRole: v.string(),
        dueAt: v.number(),
        subjectType: v.union(v.string(), v.null()),
        subjectId: v.union(v.string(), v.null()),
        createdAt: v.number(),
      }),
    ),
    messages: v.array(
      v.object({
        channel: messageChannel,
        to: v.array(v.string()),
        subject: v.string(),
        body: v.string(),
        templateKey: v.union(v.string(), v.null()),
        subjectType: v.union(v.string(), v.null()),
        subjectId: v.union(v.string(), v.null()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const already = await ctx.db.query("opsSettings").first();
    if (already) return { seeded: false, reason: "This desk already has its settings." };

    // Members first: the sample clocks and tasks belong to a role, and the
    // real member id only exists once they are in.
    const idByRole = new Map<string, string>();
    for (const member of args.members) {
      const id = await ctx.db.insert("opsMembers", member);
      if (!idByRole.has(member.role)) idByRole.set(member.role, id as string);
    }
    const owner = (role: string) => idByRole.get(role) ?? idByRole.get("ops_owner") ?? "";

    for (const setting of args.settings) {
      await ctx.db.insert("opsSettings", { ...setting, updatedBy: null, updatedAt: null });
    }
    for (const holiday of args.holidays) await ctx.db.insert("opsHolidays", holiday);
    for (const timer of args.timers) {
      await ctx.db.insert("opsTimers", {
        kind: timer.kind,
        subjectType: timer.subjectType,
        subjectId: timer.subjectId,
        startsAt: timer.startsAt,
        dueAt: timer.dueAt,
        warnAt: timer.warnAt,
        state: timer.state,
        firedAt: timer.firedAt,
        ownerId: owner(timer.ownerRole),
        payload: timer.payload,
      });
    }
    for (const task of args.tasks) {
      await ctx.db.insert("opsTasks", {
        kind: task.kind,
        title: task.title,
        body: task.body,
        assigneeId: owner(task.ownerRole),
        dueAt: task.dueAt,
        state: "open",
        subjectType: task.subjectType,
        subjectId: task.subjectId,
        link: null,
        outcome: null,
        doneBy: null,
        doneAt: null,
        createdAt: task.createdAt,
      });
    }
    for (const template of args.templates) {
      await ctx.db.insert("opsTemplates", { ...template, updatedBy: null, updatedAt: null });
    }
    for (const message of args.messages) {
      await ctx.db.insert("opsMessages", {
        channel: message.channel,
        to: message.to,
        subject: message.subject,
        body: message.body,
        templateKey: message.templateKey,
        state: "draft",
        subjectType: message.subjectType,
        subjectId: message.subjectId,
        approvedBy: null,
        approvedAt: null,
        sentAt: null,
        providerMessageId: null,
        note: null,
        createdAt: message.createdAt,
      });
    }
    await writeAudit(ctx, { actorId: null, action: "desk.seeded", subjectType: "desk", subjectId: "desk" });
    return { seeded: true, reason: null };
  },
});

/**
 * Records a file already written to R2 (15, Phase 1 step 23).
 *
 * The row comes second, after the bytes, so a link in the registry always
 * leads somewhere.
 */
export const addFile = internalMutation({
  args: {
    kind: v.string(),
    key: v.string(),
    name: v.string(),
    size: v.number(),
    mime: v.string(),
    sha256: v.string(),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    madeFrom: v.union(v.string(), v.null()),
    uploadedBy: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const uploadedAt = Date.now();
    const id = await ctx.db.insert("opsFiles", { ...args, uploadedAt });
    await writeAudit(ctx, {
      actorId: args.uploadedBy,
      action: args.madeFrom ? "file.converted" : "file.kept",
      subjectType: "file",
      subjectId: id as string,
      after: args.kind + " · " + args.name,
    });
    return { ...args, id: id as string, uploadedAt };
  },
});

/** The last scheduled clock pass. Not audited: it happens every five minutes. */
export const noteClockPass = internalMutation({
  args: { value: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("opsSettings")
      .withIndex("by_key", (q) => q.eq("key", "clock.lastPass"))
      .first();
    if (row) {
      await ctx.db.patch(row._id, { value: args.value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("opsSettings", { key: "clock.lastPass", value: args.value, updatedBy: null, updatedAt: Date.now() });
    }
    return { ok: true };
  },
});

export const setSetting = internalMutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    by: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("opsSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const before = row ? String(row.value) : null;
    if (row) {
      await ctx.db.patch(row._id, { value: args.value, updatedBy: args.by, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("opsSettings", { key: args.key, value: args.value, updatedBy: args.by, updatedAt: Date.now() });
    }
    await writeAudit(ctx, {
      actorId: args.by,
      action: "setting.changed",
      subjectType: "setting",
      subjectId: args.key,
      before,
      after: String(args.value),
      reason: args.reason,
    });
    return { ok: true };
  },
});

export const startTimer = internalMutation({
  args: {
    kind: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
    startsAt: v.number(),
    dueAt: v.number(),
    warnAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    payload: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("opsTimers", { ...args, state: "running", firedAt: null });
    await writeAudit(ctx, {
      actorId: args.ownerId,
      action: "timer.started",
      subjectType: "timer",
      subjectId: id as string,
      after: args.kind,
    });
    return { id: id as string };
  },
});

export const createTask = internalMutation({
  args: {
    kind: v.union(
      v.literal("approve"),
      v.literal("call"),
      v.literal("record"),
      v.literal("decide"),
      v.literal("remind"),
      v.literal("escalation"),
      v.literal("check"),
    ),
    title: v.string(),
    body: v.string(),
    assigneeId: v.string(),
    dueAt: v.number(),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    link: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("opsTasks", {
      ...args,
      state: "open",
      outcome: null,
      doneBy: null,
      doneAt: null,
      createdAt: Date.now(),
    });
    await writeAudit(ctx, { actorId: null, action: "task.created", subjectType: "task", subjectId: id as string, after: args.title });
    return { id: id as string };
  },
});

export const finishTask = internalMutation({
  args: { taskId: v.string(), by: v.string(), outcome: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId as never);
    if (!task) return { ok: false };
    await ctx.db.patch(args.taskId as never, {
      state: "done",
      outcome: args.outcome.trim() || null,
      doneBy: args.by,
      doneAt: Date.now(),
    });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "task.done",
      subjectType: "task",
      subjectId: args.taskId,
      before: "open",
      after: "done",
      reason: args.outcome.trim() || null,
    });
    return { ok: true };
  },
});

export const editMessage = internalMutation({
  args: { messageId: v.string(), subject: v.string(), body: v.string(), by: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId as never);
    if (!message) return { ok: false };
    const row = message as unknown as Doc<"opsMessages">;
    // A message that has already gone is a record of what was sent, not a draft.
    if (row.state !== "draft") return { ok: false };
    await ctx.db.patch(args.messageId as never, { subject: args.subject, body: args.body });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "message.edited",
      subjectType: "message",
      subjectId: args.messageId,
      before: row.subject,
      after: args.subject,
    });
    return { ok: true };
  },
});

/** Approval and what the gate decided, in one write, so neither happens alone. */
export const settleMessage = internalMutation({
  args: {
    messageId: v.string(),
    by: v.string(),
    state: v.union(v.literal("sent"), v.literal("failed"), v.literal("blocked"), v.literal("queued")),
    to: v.array(v.string()),
    note: v.union(v.string(), v.null()),
    /** What the mail server called it, once a sender knows. */
    providerMessageId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId as never);
    if (!message) return { ok: false };
    const row = message as unknown as Doc<"opsMessages">;
    await ctx.db.patch(args.messageId as never, {
      approvedBy: args.by,
      approvedAt: Date.now(),
      state: args.state,
      note: args.note,
      to: args.to,
      ...(args.state === "sent" ? { sentAt: Date.now() } : {}),
      ...(args.providerMessageId === undefined ? {} : { providerMessageId: args.providerMessageId }),
    });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "message." + args.state,
      subjectType: "message",
      subjectId: args.messageId,
      before: row.state,
      after: args.state,
      reason: args.note,
    });
    return { ok: true };
  },
});

/** The ops lead changes the wording; the old wording stays in the audit trail. */
export const saveTemplate = internalMutation({
  args: {
    key: v.string(),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    approvedForAuto: v.boolean(),
    by: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("opsTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!row) return { ok: false };
    await ctx.db.patch(row._id, {
      name: args.name,
      subject: args.subject,
      body: args.body,
      approvedForAuto: args.approvedForAuto,
      updatedBy: args.by,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "template.saved",
      subjectType: "template",
      subjectId: args.key,
      before: row.subject + " / " + row.body.slice(0, 120),
      after: args.subject + " / " + args.body.slice(0, 120),
      reason: null,
    });
    return { ok: true };
  },
});

/** One pass of the clocks, decided by the app and applied here in one go. */
export const applyTick = internalMutation({
  args: {
    warned: v.array(v.string()),
    fired: v.array(v.string()),
    firedAt: v.number(),
    tasks: v.array(
      v.object({
        kind: v.union(
          v.literal("approve"),
          v.literal("call"),
          v.literal("record"),
          v.literal("decide"),
          v.literal("remind"),
          v.literal("escalation"),
          v.literal("check"),
        ),
        title: v.string(),
        body: v.string(),
        assigneeId: v.string(),
        dueAt: v.number(),
        subjectType: v.union(v.string(), v.null()),
        subjectId: v.union(v.string(), v.null()),
        link: v.union(v.string(), v.null()),
      }),
    ),
    escalations: v.array(v.object({ taskId: v.string(), toMemberId: v.string(), note: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const id of args.warned) await ctx.db.patch(id as never, { state: "warned" });
    for (const id of args.fired) {
      await ctx.db.patch(id as never, { state: "fired", firedAt: args.firedAt });
      await writeAudit(ctx, { actorId: null, action: "timer.fired", subjectType: "timer", subjectId: id, before: "running", after: "fired" });
    }
    for (const task of args.tasks) {
      await ctx.db.insert("opsTasks", {
        ...task,
        state: "open",
        outcome: null,
        doneBy: null,
        doneAt: null,
        createdAt: args.firedAt,
      });
    }
    for (const move of args.escalations) {
      const task = await ctx.db.get(move.taskId as never);
      if (!task) continue;
      const row = task as unknown as Doc<"opsTasks">;
      await ctx.db.patch(move.taskId as never, {
        assigneeId: move.toMemberId,
        body: row.body + "\n\nPassed on: " + move.note,
      });
      await writeAudit(ctx, {
        actorId: null,
        action: "task.escalated",
        subjectType: "task",
        subjectId: move.taskId,
        before: row.assigneeId,
        after: move.toMemberId,
        reason: move.note,
      });
    }
    return { warned: args.warned.length, fired: args.fired.length, escalated: args.escalations.length };
  },
});

/** One arrival, recorded once. The mail server's id is the key. */
export const recordInbound = internalMutation({
  args: {
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    mailbox: v.string(),
    from: v.string(),
    fromName: v.string(),
    receivedAt: v.number(),
    subject: v.string(),
    body: v.string(),
    providerId: v.string(),
    inReplyTo: v.union(v.string(), v.null()),
    matchedBy: v.union(
      v.literal("reference"),
      v.literal("thread"),
      v.literal("house"),
      v.literal("domain"),
      v.literal("manual"),
      v.literal("none"),
    ),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("opsInbound")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    if (seen) return { id: seen._id as string, already: true };

    const id = await ctx.db.insert("opsInbound", {
      ...args,
      readState: args.subjectId ? ("filed" as const) : ("new" as const),
    });
    await writeAudit(ctx, {
      actorId: null,
      action: "inbound.recorded",
      subjectType: "inbound",
      subjectId: id as string,
      after: args.matchedBy,
      reason: args.note,
    });
    return { id: id as string, already: false };
  },
});

export const fileInbound = internalMutation({
  args: { inboundId: v.string(), subjectType: v.string(), subjectId: v.string(), by: v.string() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.inboundId as never);
    if (!found) return { ok: false };
    const row = found as unknown as Doc<"opsInbound">;
    await ctx.db.patch(args.inboundId as never, {
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      matchedBy: "manual",
      readState: "filed",
      note: "Filed by hand.",
    });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "inbound.filed",
      subjectType: "inbound",
      subjectId: args.inboundId,
      before: row.subjectId,
      after: args.subjectId,
    });
    return { ok: true };
  },
});

export const markInboundActioned = internalMutation({
  args: { inboundId: v.string(), by: v.string() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.inboundId as never);
    if (!found) return { ok: false };
    await ctx.db.patch(args.inboundId as never, { readState: "actioned" });
    await writeAudit(ctx, {
      actorId: args.by,
      action: "inbound.actioned",
      subjectType: "inbound",
      subjectId: args.inboundId,
      before: "filed",
      after: "actioned",
    });
    return { ok: true };
  },
});

/** The client answered: every chase for that subject stops at once. */
export const cancelTimers = internalMutation({
  args: { timerIds: v.array(v.string()), by: v.string() },
  handler: async (ctx, args) => {
    for (const id of args.timerIds) {
      await ctx.db.patch(id as never, { state: "cancelled" });
      await writeAudit(ctx, {
        actorId: args.by,
        action: "timer.cancelled",
        subjectType: "timer",
        subjectId: id,
        before: "running",
        after: "cancelled",
        reason: "The client replied.",
      });
    }
    return { cancelled: args.timerIds.length };
  },
});
