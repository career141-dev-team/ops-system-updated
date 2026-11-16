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
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  /** Every number and switch. Nothing that matters is buried in the code. */
  /**
   * The wording of what we send, so the ops lead can change a chase email
   * without waiting for a release (15, Phase 1 step 25).
   */
  /** The file registry (15, Phase 1 step 23). The bytes live in R2, not here. */
  opsFiles: defineTable({
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
    uploadedAt: v.number(),
  })
    .index("by_subject", ["subjectType", "subjectId"])
    .index("by_uploaded", ["uploadedAt"]),

  /** Calls a person made (15, Phase 1 step 24). No telephony: this is a record. */
  opsCalls: defineTable({
    taskId: v.union(v.string(), v.null()),
    to: v.string(),
    toName: v.string(),
    purpose: v.string(),
    spokeTo: v.string(),
    outcome: v.string(),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    by: v.string(),
    at: v.number(),
  }).index("by_at", ["at"]),

  /** How bad it is today, measured before we changed anything (step 0). */
  opsBaseline: defineTable({
    measure: v.string(),
    period: v.string(),
    value: v.number(),
    note: v.string(),
    by: v.string(),
    at: v.number(),
  }).index("by_measure", ["measure"]),

  /** Every call to the TA System, so "is the window open" has an answer. */
  opsTaCalls: defineTable({
    direction: v.string(),
    path: v.string(),
    ok: v.boolean(),
    status: v.union(v.number(), v.null()),
    ms: v.number(),
    note: v.union(v.string(), v.null()),
    at: v.number(),
  }).index("by_at", ["at"]),

  /** Writes waiting to reach the TA System, with the key that makes a repeat safe. */
  opsOutbox: defineTable({
    path: v.string(),
    body: v.any(),
    idempotencyKey: v.string(),
    state: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.union(v.string(), v.null()),
    nextTryAt: v.union(v.number(), v.null()),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    createdAt: v.number(),
    sentAt: v.union(v.number(), v.null()),
  })
    .index("by_state", ["state"])
    .index("by_key", ["idempotencyKey"]),

  /** What the TA System told us, in order, each one kept once (Part E3). */
  opsEvents: defineTable({
    taEventId: v.string(),
    type: v.string(),
    data: v.any(),
    receivedAt: v.number(),
    handledAt: v.union(v.number(), v.null()),
    attempts: v.number(),
    lastError: v.union(v.string(), v.null()),
    note: v.string(),
  })
    .index("by_taEventId", ["taEventId"])
    .index("by_received", ["receivedAt"]),

  /** Leads: the front door (15, Phase 2). */
  opsLeads: defineTable({
    company: v.string(),
    nameKey: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    source: v.string(),
    industry: v.string(),
    website: v.string(),
    notes: v.string(),
    industryFlagged: v.boolean(),
    industryBecause: v.union(v.string(), v.null()),
    industryConfirmedBy: v.union(v.string(), v.null()),
    state: v.string(),
    reason: v.union(v.string(), v.null()),
    doNotInvite: v.boolean(),
    clientTaId: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdBy: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nameKey", ["nameKey"])
    .index("by_state", ["state"])
    .index("by_created", ["createdAt"]),

  /** Meetings with a client: the intro call and the requirement meeting. */
  opsMeetings: defineTable({
    leadId: v.string(),
    kind: v.string(),
    at: v.number(),
    state: v.string(),
    taLeadId: v.string(),
    rebookCount: v.number(),
    brief: v.string(),
    role: v.string(),
    packageSaid: v.string(),
    reason: v.union(v.string(), v.null()),
    bookedBy: v.string(),
    heldAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_at", ["at"]),

  /** The client agreement, one per client, versioned (15, Phase 2). */
  /** A company we work for (15, Phase 2 step 19). */
  opsClients: defineTable({
    leadId: v.union(v.string(), v.null()),
    taClientId: v.union(v.string(), v.null()),
    name: v.string(),
    nameKey: v.string(),
    stage: v.string(),
    billingName: v.string(),
    billingEmail: v.string(),
    groupName: v.string(),
    notes: v.string(),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nameKey", ["nameKey"])
    .index("by_stage", ["stage"])
    .index("by_created", ["createdAt"]),

  /** One round of CVs sent to a client (15, Phase 4). */
  opsClientSets: defineTable({
    taRoundId: v.string(),
    openingTaId: v.string(),
    setNumber: v.number(),
    clientId: v.union(v.string(), v.null()),
    clientTaId: v.string(),
    name: v.string(),
    role: v.string(),
    state: v.string(),
    candidates: v.any(),
    dueAt: v.union(v.number(), v.null()),
    sentAt: v.union(v.number(), v.null()),
    sentMessageId: v.union(v.string(), v.null()),
    sentTo: v.array(v.string()),
    receivedAt: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_round", ["taRoundId"])
    .index("by_state", ["state"])
    .index("by_created", ["createdAt"]),

  /** A position held because the client went quiet (15, Phase 4). */
  opsHolds: defineTable({
    openingTaId: v.string(),
    setId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    state: v.string(),
    reason: v.string(),
    liftedReason: v.union(v.string(), v.null()),
    noticeMessageId: v.union(v.string(), v.null()),
    proposedAt: v.number(),
    heldAt: v.union(v.number(), v.null()),
    liftedAt: v.union(v.number(), v.null()),
    reviewAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opening", ["openingTaId"])
    .index("by_state", ["state"])
    .index("by_created", ["createdAt"]),

  /** What the client said they want (15, Phase 3). */
  opsRequirements: defineTable({
    leadId: v.string(),
    clientId: v.union(v.string(), v.null()),
    clientTaId: v.string(),
    meetingId: v.union(v.string(), v.null()),
    version: v.number(),
    fields: v.any(),
    practical: v.boolean(),
    reason: v.union(v.string(), v.null()),
    inviteBackAt: v.union(v.number(), v.null()),
    openedAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_created", ["createdAt"]),

  /** Our side of an opening in the TA System (15, Phase 3). */
  opsPositions: defineTable({
    requirementId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    clientTaId: v.string(),
    openingTaId: v.union(v.string(), v.null()),
    title: v.string(),
    stage: v.string(),
    primaryTaId: v.union(v.string(), v.null()),
    hundredPercentDay: v.union(v.string(), v.null()),
    taStatus: v.union(v.string(), v.null()),
    jdApprovedAt: v.union(v.number(), v.null()),
    linkedInUrl: v.union(v.string(), v.null()),
    linkedInPostedAt: v.union(v.number(), v.null()),
    depthStage: v.union(v.string(), v.null()),
    shortlistedTotal: v.union(v.number(), v.null()),
    pendingCount: v.union(v.number(), v.null()),
    depthCheckedAt: v.union(v.number(), v.null()),
    handedOverAt: v.number(),
    closedAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opening", ["openingTaId"])
    .index("by_stage", ["stage"])
    .index("by_created", ["createdAt"]),

  /** One week's Talent Pulse (15, Phase 3 steps 14 and 15). */
  opsTalentPulse: defineTable({
    weekOf: v.string(),
    state: v.string(),
    lines: v.any(),
    postedAt: v.union(v.number(), v.null()),
    postedBy: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week", ["weekOf"])
    .index("by_created", ["createdAt"]),

  /** One run of the AI layer (15, Phase 9 step 1). */
  opsAiRuns: defineTable({
    task: v.string(),
    provider: v.string(),
    model: v.union(v.string(), v.null()),
    read: v.array(v.string()),
    proposed: v.any(),
    outcome: v.union(v.string(), v.null()),
    kept: v.any(),
    ok: v.boolean(),
    because: v.union(v.string(), v.null()),
    tokensIn: v.number(),
    tokensOut: v.number(),
    cost: v.number(),
    ms: v.number(),
    subjectType: v.union(v.string(), v.null()),
    subjectId: v.union(v.string(), v.null()),
    by: v.string(),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_task", ["task"]),

  /** The desk assistant's thread, one row a line (8 Nov, docs/31). */
  opsChat: defineTable({
    memberId: v.string(),
    who: v.string(),
    text: v.string(),
    buttons: v.array(v.object({ label: v.string(), action: v.string(), fields: v.record(v.string(), v.string()), shows: v.array(v.object({ label: v.string(), value: v.string(), href: v.string(), field: v.string() })) })),
    state: v.string(),
    actionName: v.union(v.string(), v.null()),
    runId: v.union(v.string(), v.null()),
    at: v.number(),
    thread: v.optional(v.string()),
  })
    .index("by_member", ["memberId", "at"])
    .index("by_at", ["at"]),

  opsChatThreads: defineTable({
    memberId: v.string(),
    name: v.string(),
    at: v.number(),
  }).index("by_member", ["memberId"]),

  /** One paid advert, TopJobs today (15, Phase 3 step 12). */
  opsAds: defineTable({
    channel: v.string(),
    openingTaId: v.string(),
    positionId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    title: v.string(),
    state: v.string(),
    kind: v.string(),
    cost: v.union(v.number(), v.null()),
    flyerFileId: v.union(v.string(), v.null()),
    applyAlias: v.union(v.string(), v.null()),
    orderMessageId: v.union(v.string(), v.null()),
    requestedAt: v.number(),
    orderedAt: v.union(v.number(), v.null()),
    liveAt: v.union(v.number(), v.null()),
    closesAt: v.union(v.number(), v.null()),
    closedAt: v.union(v.number(), v.null()),
    cvCount: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opening", ["openingTaId"])
    .index("by_state", ["state"])
    .index("by_created", ["createdAt"]),

  /** One guarantee: ninety days from joining, on a paid fee (15, Phase 7). */
  opsGuarantees: defineTable({
    placementId: v.string(),
    openingTaId: v.string(),
    clientId: v.union(v.string(), v.null()),
    candidateName: v.string(),
    state: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    feePaidAt: v.union(v.number(), v.null()),
    leftAt: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
    deadlineAt: v.union(v.number(), v.null()),
    replacedByPlacementId: v.union(v.string(), v.null()),
    refundPct: v.union(v.number(), v.null()),
    refundAmount: v.union(v.number(), v.null()),
    decidedBy: v.union(v.string(), v.null()),
    decidedAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_placement", ["placementId"])
    .index("by_opening", ["openingTaId"])
    .index("by_end", ["endsAt"])
    .index("by_created", ["createdAt"]),

  /** The close checklist for one position (15, Phase 7 step 11). */
  opsCloseChecklists: defineTable({
    openingTaId: v.string(),
    positionId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    trigger: v.string(),
    items: v.any(),
    completedAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_opening", ["openingTaId"])
    .index("by_created", ["createdAt"]),

  /** A placement taken from TA, with the agreement's fee rule on it. */
  opsPlacements: defineTable({
    placementTaId: v.string(),
    applicationTaId: v.string(),
    openingTaId: v.string(),
    positionId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    candidateName: v.string(),
    state: v.string(),
    monthlySalary: v.union(v.number(), v.null()),
    currency: v.string(),
    offerLetterFileRef: v.union(v.string(), v.null()),
    joinDate: v.union(v.number(), v.null()),
    joinedAt: v.union(v.number(), v.null()),
    dojHistory: v.any(),
    feeMonths: v.number(),
    feeBasis: v.string(),
    isReplacementOf: v.union(v.string(), v.null()),
    invoiceId: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    noShowChoice: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_placement_ta", ["placementTaId"])
    .index("by_opening", ["openingTaId"])
    .index("by_join", ["joinDate"])
    .index("by_created", ["createdAt"]),

  /** One invoice, with its payments on it (15, Phase 6). */
  opsInvoices: defineTable({
    number: v.string(),
    kind: v.string(),
    placementId: v.union(v.string(), v.null()),
    about: v.union(v.string(), v.null()),
    setId: v.union(v.string(), v.null()),
    againstInvoiceId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    state: v.string(),
    amount: v.number(),
    currency: v.string(),
    lateCharge: v.number(),
    lateMonths: v.number(),
    disputed: v.boolean(),
    disputedReason: v.union(v.string(), v.null()),
    payments: v.any(),
    sentAt: v.union(v.number(), v.null()),
    sentMessageId: v.union(v.string(), v.null()),
    dueAt: v.union(v.number(), v.null()),
    paidAt: v.union(v.number(), v.null()),
    writtenOffAt: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_state", ["state"])
    .index("by_due", ["dueAt"])
    .index("by_created", ["createdAt"]),

  /** One interview, the client's side of it (15, Phase 5). */
  opsInterviews: defineTable({
    applicationTaId: v.string(),
    openingTaId: v.string(),
    positionId: v.union(v.string(), v.null()),
    clientId: v.union(v.string(), v.null()),
    candidateName: v.string(),
    scheduler: v.string(),
    state: v.string(),
    round: v.number(),
    slots: v.array(v.number()),
    slotAnswers: v.optional(v.array(v.object({ at: v.number(), free: v.boolean() }))),
    slotLoops: v.number(),
    reschedules: v.optional(
      v.array(v.object({ from: v.number(), to: v.number(), by: v.string(), at: v.number(), reason: v.string() })),
    ),
    at: v.union(v.number(), v.null()),
    format: v.string(),
    interviewers: v.array(v.string()),
    whereOrLink: v.string(),
    interviewTaId: v.union(v.string(), v.null()),
    inviteMessageId: v.union(v.string(), v.null()),
    attendedAt: v.union(v.number(), v.null()),
    decision: v.union(v.string(), v.null()),
    decisionReason: v.union(v.string(), v.null()),
    decidedAt: v.union(v.number(), v.null()),
    candidateFeedback: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_application", ["applicationTaId"])
    .index("by_opening", ["openingTaId"])
    .index("by_at", ["at"])
    .index("by_created", ["createdAt"]),

  /** A reference check, only when the client asks (15, Phase 5 step 17). */
  opsReferences: defineTable({
    applicationTaId: v.string(),
    openingTaId: v.string(),
    candidateName: v.string(),
    state: v.string(),
    report: v.union(v.string(), v.null()),
    requestedAt: v.number(),
    reportedAt: v.union(v.number(), v.null()),
    relayMessageId: v.union(v.string(), v.null()),
    decision: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_application", ["applicationTaId"])
    .index("by_created", ["createdAt"]),

  /** One weekly report, kept as it was built (15, Phase 7 step 9). */
  opsReports: defineTable({
    kind: v.string(),
    weekOf: v.string(),
    state: v.string(),
    rows: v.any(),
    note: v.union(v.string(), v.null()),
    builtAt: v.number(),
    approvedBy: v.union(v.string(), v.null()),
    approvedAt: v.union(v.number(), v.null()),
    messageId: v.union(v.string(), v.null()),
    sentAt: v.union(v.number(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week", ["weekOf"])
    .index("by_created", ["createdAt"]),

  opsEsa: defineTable({
    leadId: v.string(),
    clientTaId: v.union(v.string(), v.null()),
    state: v.string(),
    version: v.number(),
    fields: v.any(),
    draftFileId: v.union(v.string(), v.null()),
    sentAt: v.union(v.number(), v.null()),
    sentMessageId: v.union(v.string(), v.null()),
    chaseStep: v.number(),
    expiresAt: v.union(v.number(), v.null()),
    signedAt: v.union(v.number(), v.null()),
    signedFileId: v.union(v.string(), v.null()),
    countersignedAt: v.union(v.number(), v.null()),
    countersignedFileId: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_state", ["state"]),

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
    /** The message this one answers, so a reply lands in their own thread. */
    inReplyToProviderId: v.optional(v.union(v.string(), v.null())),
    /** Why it was blocked or failed, in words a person can act on. */
    note: v.union(v.string(), v.null()),
    /**
     * Always a list, never missing (6 Nov).
     *
     * It was optional, so a message written without it came back from Convex
     * with no field at all, while the TypeScript type says `Id[]` - and the
     * mailbox read `.length` of it. Every screen was fine on the JSON store
     * and /mail was a 500 on the real one. A field the type calls required is
     * required here too.
     */
    attachmentFileIds: v.array(v.string()),
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
