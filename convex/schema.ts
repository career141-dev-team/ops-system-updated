import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * The Ops database (15, Part D2 Foundation).
 *
 * Its own deployment and its own database, never the TA System's. Nothing that
 * belongs to the TA System is stored here: openings, candidates, placements and
 * interviews are read through the API and kept by TA, so there is one copy of
 * each fact in the company, not two that disagree.
 *
 * The field names match `src/data/types.ts` exactly, so the JSON store the
 * screens and tests run on and this backend are the same shape (2 Nov).
 */

export const timerState = v.union(
  v.literal("running"),
  v.literal("warned"),
  v.literal("fired"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const taskKind = v.union(
  v.literal("approve"),
  v.literal("call"),
  v.literal("record"),
  v.literal("decide"),
  v.literal("remind"),
  v.literal("escalation"),
  v.literal("check"),
);

export const messageChannel = v.union(
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("group_post"),
  v.literal("internal"),
);

export const messageState = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("blocked"),
);

export default defineSchema({
  /** The people who work in Ops. Provisioned from sign-in, never typed twice. */
  opsMembers: defineTable({
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
    /** The same person in the TA System, matched by email. */
    taUserId: v.union(v.string(), v.null()),
    clerkUserId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  /** Every number and switch. Nothing that matters is buried in the code. */
  /**
   * The wording of what we send, so the ops lead can change a chase email
   * without waiting for a release (15, Phase 1 step 25).
   */
  opsTemplates: defineTable({
    key: v.string(),
    channel: messageChannel,
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    /** Whether routine notices from this wording may go without a person. */
    approvedForAuto: v.boolean(),
    updatedBy: v.union(v.string(), v.null()),
    updatedAt: v.union(v.number(), v.null()),
  }).index("by_key", ["key"]),

  opsSettings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    updatedBy: v.union(v.string(), v.null()),
    updatedAt: v.union(v.number(), v.null()),
  }).index("by_key", ["key"]),

  /** Sri Lanka's holidays, so "seven working days" means one thing. */
  opsHolidays: defineTable({
    date: v.string(),
    name: v.string(),
  }).index("by_date", ["date"]),

  /** One row per clock. The reason nobody has to hold a deadline in their head. */
  opsTimers: defineTable({
    kind: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
    startsAt: v.number(),
    dueAt: v.number(),
    warnAt: v.union(v.number(), v.null()),
    state: timerState,
    firedAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    payload: v.record(v.string(), v.string()),
  })
    .index("by_state_due", ["state", "dueAt"])
    .index("by_subject", ["subjectType", "subjectId"])
    .index("by_owner", ["ownerId"]),

  /** The inbox is a view over these. */
  opsTasks: defineTable({
    kind: taskKind,
    title: v.string(),
    body: v.string(),
    assigneeId: v.string(),
    dueAt: v.number(),
    state: v.union(v.literal("open"), v.literal("done"), v.literal("dismissed"), v.literal("snoozed")),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    link: v.union(v.string(), v.null()),
    outcome: v.union(v.string(), v.null()),
    doneBy: v.union(v.string(), v.null()),
    doneAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
  })
    .index("by_assignee_state", ["assigneeId", "state"])
    .index("by_state_due", ["state", "dueAt"])
    .index("by_subject", ["subjectType", "subjectId"]),

  /** One way out. Nothing reaches a client except through a row here. */
  opsMessages: defineTable({
    channel: messageChannel,
    to: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
    templateKey: v.union(v.string(), v.null()),
    state: messageState,
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    approvedBy: v.union(v.string(), v.null()),
    approvedAt: v.union(v.number(), v.null()),
    sentAt: v.union(v.number(), v.null()),
    /** What the mail server called it when it went; a reply quotes this. */
    providerMessageId: v.union(v.string(), v.null()),
    /** Why it was blocked or failed, in words a person can act on. */
    note: v.union(v.string(), v.null()),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_subject", ["subjectType", "subjectId"]),

  /** One email that arrived. One way in, as opsMessages is the one way out. */
  opsInbound: defineTable({
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
    readState: v.union(v.literal("new"), v.literal("filed"), v.literal("actioned")),
    note: v.string(),
  })
    .index("by_provider", ["providerId"])
    .index("by_readState", ["readState"])
    .index("by_received", ["receivedAt"]),

  /** Who changed what, before and after, and why. Everything, always. */
  opsAudit: defineTable({
    actorId: v.union(v.string(), v.null()),
    action: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
    before: v.union(v.string(), v.null()),
    after: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_subject", ["subjectType", "subjectId"]),
});
