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
  matchedBy: "reference" | "thread" | "domain" | "manual" | "none";
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

export interface OpsDatabase {
  members: OpsMember[];
  settings: OpsSetting[];
  holidays: OpsHoliday[];
  timers: OpsTimer[];
  tasks: OpsTask[];
  messages: OpsMessage[];
  inbound: OpsInbound[];
  audit: OpsAuditEntry[];
}
