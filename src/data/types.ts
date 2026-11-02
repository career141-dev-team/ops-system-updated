/**
 * The Ops records, exactly the foundation tables of the build plan (15, D2).
 *
 * The names match what the Convex schema will hold, so the JSON store used for
 * screens and tests and the real backend are the same shape (2 Nov). Anything
 * that belongs to the TA System — openings, candidates, placements — is NOT
 * here: Ops reads those through the API and never keeps a second copy.
 */

export type Id = string;

/** Who works in Ops, and what they are allowed to do. */
export type OpsRole =
  | "ops_owner"
  | "ops_lead"
  | "accounts"
  | "director_ops"
  | "marketing"
  | "director_ro"
  | "ta_lead_ro";

export interface OpsMember {
  id: Id;
  name: string;
  email: string;
  role: OpsRole;
  active: boolean;
  /** The same person's TA System account, matched by email, when they have one. */
  taUserId: Id | null;
}

/** Every number and switch lives here, never in the code. */
export interface OpsSetting {
  key: string;
  value: string | number | boolean;
  updatedBy: Id | null;
  updatedAt: number | null;
}

export interface OpsHoliday {
  date: string;
  name: string;
}

export type TimerState = "running" | "warned" | "fired" | "done" | "cancelled";

/** One clock. The thing that stops Ops holding deadlines in their heads. */
export interface OpsTimer {
  id: Id;
  kind: string;
  subjectType: string;
  subjectId: Id;
  startsAt: number;
  dueAt: number;
  warnAt: number | null;
  state: TimerState;
  firedAt: number | null;
  ownerId: Id;
  payload: Record<string, string>;
}

export type TaskKind = "approve" | "call" | "record" | "decide" | "remind" | "escalation" | "check";
export type TaskState = "open" | "done" | "dismissed" | "snoozed";

export interface OpsTask {
  id: Id;
  kind: TaskKind;
  title: string;
  body: string;
  assigneeId: Id;
  dueAt: number;
  state: TaskState;
  subjectType: string | null;
  subjectId: Id | null;
  /** Where the task takes you on the screen. */
  link: string | null;
  /** What was decided or said, written when it is done. */
  outcome: string | null;
  doneBy: Id | null;
  doneAt: number | null;
  createdAt: number;
}

export type MessageChannel = "email" | "whatsapp" | "group_post" | "internal";
export type MessageState = "draft" | "approved" | "queued" | "sent" | "failed" | "blocked";

/** One way out. Nothing reaches a client except through a row here. */
export interface OpsMessage {
  id: Id;
  channel: MessageChannel;
  to: string[];
  subject: string;
  body: string;
  templateKey: string | null;
  state: MessageState;
  subjectType: string | null;
  subjectId: Id | null;
  approvedBy: Id | null;
  approvedAt: number | null;
  sentAt: number | null;
  /**
   * The id the mail server gave this message when it actually went (2 Nov).
   * A client's reply carries it in `In-Reply-To`, so it is the only thing that
   * matches a reply to its thread with certainty. Null until a sender fills it
   * in: it cannot be worked out in advance, and guessing it was a bug.
   */
  providerMessageId: string | null;
  /** Why it was blocked or failed, in words a person can act on. */
  note: string | null;
  createdAt: number;
}

/** One email that arrived. One way in, as `OpsMessage` is the one way out. */
export interface OpsInbound {
  id: Id;
  channel: "email" | "whatsapp";
  /** Which of our mailboxes it arrived in (2 Nov: there are several). */
  mailbox: string;
  from: string;
  fromName: string;
  receivedAt: number;
  subject: string;
  body: string;
  /** The mail server's own id, so the same email is never recorded twice. */
  providerId: string;
  inReplyTo: string | null;
  /** How it was matched, and to what. Null until somebody or something files it. */
  matchedBy: "reference" | "thread" | "house" | "domain" | "manual" | "none";
  subjectType: string | null;
  subjectId: string | null;
  clientId: string | null;
  readState: "new" | "filed" | "actioned";
  note: string;
}

/** Who changed what, before and after, and why. */
export interface OpsAuditEntry {
  id: Id;
  actorId: Id | null;
  action: string;
  subjectType: string;
  subjectId: Id;
  before: string | null;
  after: string | null;
  reason: string | null;
  at: number;
}

export interface OpsTemplate {
  /** Dotted and stable, because code asks for a template by key: `esa.chase.1`. */
  key: string;
  channel: MessageChannel;
  /** What a person sees in the list. */
  name: string;
  /** Email only. WhatsApp and group posts have no subject. */
  subject: string;
  body: string;
  /**
   * Whether a routine notice from this template may go without anybody reading
   * it. The owner's rule: only wording approved once, and only for notices —
   * never for anything written to a client about one position.
   */
  approvedForAuto: boolean;
  updatedBy: string | null;
  updatedAt: number | null;
}

/**
 * One kept file. The row is the record; the bytes are in R2, or in a folder on
 * this machine while we build. `sha256` is what proves a year later that the
 * file somebody opens is the file that went out.
 */
export interface OpsFile {
  id: Id;
  kind: string;
  /** Where it lives in the bucket. Never built from the name alone. */
  key: string;
  name: string;
  size: number;
  mime: string;
  sha256: string;
  subjectType: string | null;
  subjectId: Id | null;
  /** The file this one was made from, for a PDF made out of a Word document. */
  madeFrom: Id | null;
  uploadedBy: Id | null;
  uploadedAt: number;
}

/**
 * One call somebody made (15, Phase 1 step 24).
 *
 * Calls stay human by the owner's decision, so this is a record of what a
 * person did, never something the system did: who was rung, who answered, and
 * what was said.
 */
export interface OpsCallLog {
  id: Id;
  /** The call task this answers, when it came from one. */
  taskId: Id | null;
  to: string;
  toName: string;
  purpose: string;
  spokeTo: string;
  outcome: string;
  subjectType: string | null;
  subjectId: Id | null;
  by: Id;
  at: number;
}

/**
 * How bad it is today, measured before we change anything (15, Phase 1 step 0).
 *
 * The owner's instruction was "strategy first: measure today's numbers", so
 * the weekly report can one day say what changed. Entered by hand from the
 * archive, because there is no system to read it out of.
 */
export interface OpsBaseline {
  id: Id;
  /** `esa.returnDays`, `set.clientWaitDays`, `hire.slippedCount`, or another. */
  measure: string;
  /** Which months it covers, in words: "May to October 2026". */
  period: string;
  value: number;
  note: string;
  by: Id;
  at: number;
}

/** Every call to the TA System, so "is the window working" has an answer. */
export interface OpsTaCall {
  id: Id;
  direction: "read" | "write" | "events";
  path: string;
  ok: boolean;
  /** The HTTP status, or null when we never got that far. */
  status: number | null;
  ms: number;
  note: string | null;
  at: number;
}

export type OutboxState = "queued" | "sent" | "failed";

/**
 * A write waiting to reach the TA System (15, Phase 1 step 21).
 *
 * Ops never writes into TA's database; it asks the API. The API can be down,
 * and an opening that was asked for must not be lost because of it, so every
 * write is a row here first and is retried. The key makes a repeat harmless:
 * asking twice must not create two openings.
 */
export interface OpsOutboxItem {
  id: Id;
  path: string;
  body: Record<string, unknown>;
  idempotencyKey: string;
  state: OutboxState;
  attempts: number;
  lastError: string | null;
  /** Not tried again before this. Empty while it has never been tried. */
  nextTryAt: number | null;
  subjectType: string | null;
  subjectId: Id | null;
  createdAt: number;
  sentAt: number | null;
}

/**
 * Something that happened in the TA System (15, Part E3).
 *
 * TA writes events; Ops reads them in order and never goes back. The cursor
 * only moves past a batch that was handled, so nothing is skipped — which is
 * the whole reason Asma learned of a January joining in March.
 */
export interface OpsEvent {
  id: Id;
  taEventId: string;
  type: string;
  data: Record<string, unknown>;
  receivedAt: number;
  handledAt: number | null;
  attempts: number;
  lastError: string | null;
  note: string;
}

/**
 * A company that asked us to find somebody (15, Phase 2).
 *
 * The front door. It carries where it came from, who owns it, what we decided
 * about the industry, and - if it is a company we already have - which TA
 * client it is. Nothing about the search lives here; that is TA's.
 */
export interface OpsLead {
  id: Id;
  company: string;
  /** The company name in the one shape we compare on, as TA does it. */
  nameKey: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  source: string;
  industry: string;
  website: string;
  notes: string;
  /** Proposed by the words in front of us; a person confirms it. */
  industryFlagged: boolean;
  industryBecause: string | null;
  industryConfirmedBy: Id | null;
  state: string;
  /** Why it closed. The owner's rule: nothing closes without one. */
  reason: string | null;
  /** Declined for the industry means never invited back. */
  doNotInvite: boolean;
  /** The TA client this is, once we know it is a company we already have. */
  clientTaId: Id | null;
  ownerId: Id;
  createdBy: Id | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * A meeting with a client (15, Phase 2 steps 7 and 8).
 *
 * The intro call and the requirement meeting are the same record. What makes
 * it worth keeping is the two things that go missing today: how many times we
 * have tried to rebook it, and what was actually said - which is the only
 * record of the brief until the opening exists.
 */
export interface OpsMeeting {
  id: Id;
  leadId: Id;
  kind: string;
  at: number;
  state: string;
  /** The TA lead on the call. One is on every intro call (owner's rule). */
  taLeadId: string;
  /** Our own attempts, so the third unanswered one closes the lead. */
  rebookCount: number;
  /** What was said. Required before a meeting can be marked held. */
  brief: string;
  role: string;
  packageSaid: string;
  /** Why it was not held, or why it was cancelled. */
  reason: string | null;
  bookedBy: Id;
  heldAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * The client agreement (15, Phase 2 steps 9 to 18).
 *
 * One per client, with its own version number: a client who asks for changes
 * gets a new version of the same agreement, not a second agreement. The
 * fields are what the document is filled from, kept with the version so that
 * "what did they actually sign" has an answer a year later.
 */
export interface OpsEsa {
  id: Id;
  leadId: Id;
  clientTaId: Id | null;
  state: string;
  version: number;
  /** What the document is filled from. Required ones must not be blank. */
  fields: Record<string, string>;
  /** The drafted document, once there is one. */
  draftFileId: Id | null;
  sentAt: number | null;
  sentMessageId: Id | null;
  /** 0 to 6, the owner's chase plan: email, WhatsApp, email, WhatsApp, email, call. */
  chaseStep: number;
  expiresAt: number | null;
  signedAt: number | null;
  signedFileId: Id | null;
  countersignedAt: number | null;
  countersignedFileId: Id | null;
  /** Why it was declined, or what they want changed. */
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

export interface OpsDatabase {
  members: OpsMember[];
  settings: OpsSetting[];
  holidays: OpsHoliday[];
  timers: OpsTimer[];
  tasks: OpsTask[];
  messages: OpsMessage[];
  inbound: OpsInbound[];
  templates: OpsTemplate[];
  files: OpsFile[];
  leads: OpsLead[];
  meetings: OpsMeeting[];
  agreements: OpsEsa[];
  calls: OpsCallLog[];
  baseline: OpsBaseline[];
  taCalls: OpsTaCall[];
  outbox: OpsOutboxItem[];
  events: OpsEvent[];
  audit: OpsAuditEntry[];
}
