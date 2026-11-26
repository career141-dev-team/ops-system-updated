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
  | "admin"
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
  /**
   * The provider id of the message this one answers (5 Nov).
   *
   * It is what makes a reply land in the client's own thread rather than as a
   * new email, and it is how our own mailbox screen joins a conversation back
   * together when somebody rewrites the subject.
   */
  inReplyToProviderId?: string | null;
  /** Why it was blocked or failed, in words a person can act on. */
  note: string | null;
  /**
   * The files that go with it, from the file registry (3 Nov).
   *
   * The agreement is the first message that has to carry something: a cover
   * email with nothing attached is worse than no email.
   */
  attachmentFileIds: Id[];
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
  /** "phone" (23 Nov): a WhatsApp number that is exactly one known person's. */
  matchedBy: "reference" | "thread" | "house" | "domain" | "phone" | "manual" | "none";
  subjectType: string | null;
  subjectId: string | null;
  clientId: string | null;
  readState: "new" | "filed" | "actioned";
  note: string;
  /** "out" is our own mail read back from Sent Items (16 Nov): shown in its thread, never a reply. Absent means in. */
  direction?: "in" | "out";
  /** Out only: who it went to. */
  to?: string[];
  /** File names the email carried (16 Nov). */
  attachments?: string[];
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
  /** "Open it now, without waiting" (17 Nov): who chose it, when, and why. Optional: older rows have none. */
  openEarlyBy?: Id | null;
  openEarlyAt?: number | null;
  openEarlyReason?: string | null;
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
  // 26 Nov: the Nov 25 ops meeting: position, JD, salary scale.
  positionId?: string;
  jd?: string;
  salaryScale?: string;
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
  /** One meeting that is both the intro call and the requirement meeting (17 Nov). */
  alsoRequirement?: boolean;
  /** Teams (17 Nov). Optional: rows booked before it have none of these. */
  lengthMin?: number;
  /** Whose Outlook calendar the meeting is in. */
  organiserId?: Id;
  /** The client people who get the join link, by drafted email. */
  attendees?: { name: string; email: string }[];
  joinUrl?: string | null;
  graphEventId?: string | null;
  /** Why no Teams link was made, in a sentence; null when one was. */
  teamsProblem?: string | null;
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
  // 26 Nov: the Nov 25 ops meeting: absent = final.
  mode?: "draft" | "final";
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

/**
 * A company we work for (15, Phase 2 step 19).
 *
 * Made when they become ours - an exact match against a TA client, or the
 * agreement countersigned - and from then on it carries the things that live
 * in somebody's memory today: the one ops owner, who we invoice, and which
 * WhatsApp group is theirs.
 */
export interface OpsClient {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: local or international.
  clientType?: "local" | "international";
  /** The lead they came in as, which keeps the whole history reachable. */
  leadId: Id | null;
  /** The same company in the TA System, once we know which one it is. */
  taClientId: Id | null;
  name: string;
  /** The name reduced the way TA reduces it, so a match is a match. */
  nameKey: string;
  stage: string;
  /** Who we send the invoice to. Often not known while onboarding. */
  billingName: string;
  billingEmail: string;
  /** Where the invoice is addressed. The invoice is not drafted without it (16 Nov). */
  billingAddress: string;
  /** Their WhatsApp group, by its name: the sets and feedback go there. */
  groupName: string;
  /** The client's standard contacts, who get everything (17 Nov). Optional: older rows have none. */
  contacts?: { name: string; email: string; phone: string; role: string }[];
  notes: string;
  /** Why they are quiet or closed. */
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One round of CVs sent to a client (15, Phase 4 steps 2 to 4).
 *
 * TA decides what is in it and numbers it; Ops decides when it goes, keeps a
 * copy of exactly what went, and owns everything that happens afterwards.
 */
export interface OpsClientSet {
  id: Id;
  /** TA's own id for the round, and the opening it belongs to. */
  taRoundId: string;
  openingTaId: string;
  setNumber: number;
  /** Our client record, when we have one, and TA's client either way. */
  clientId: Id | null;
  clientTaId: string;
  /** "CLIENT > ROLE > SET n", as the desk already writes it. */
  name: string;
  role: string;
  state: string;
  /** Who it is for, and our copy of each prepared CV. */
  candidates: {
    applicationTaId: string;
    name: string;
    fileId: Id | null;
    problem: string | null;
    /**
     * The client said they already had this one (step 7). Kept on the
     * candidate rather than in a table of its own: there is exactly one claim
     * per candidate per set, and a table would only hold the same row.
     */
    claimedAt?: number | null;
    claimVerdict?: string | null;
    claimReason?: string | null;
    /** What the client decided about them, once they say (step 9). */
    decision?: string | null;
    decisionReason?: string | null;
    decidedAt?: number | null;
    /** Our own team's interview before the CV goes (owner, 16 Nov). */
    internalInterview?: { by: string; at: number; outcome: "pass" | "hold" | "fail"; notes: string } | null;
  }[];
  /** Due at the client, counted from the day the agreement was signed. */
  dueAt: number | null;
  sentAt: number | null;
  sentMessageId: Id | null;
  sentTo: string[];
  /** When the client got it. The clocks that follow count from this. */
  receivedAt: number | null;
  /** Why it was pulled back. */
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * A position held because the client went quiet (15, Phase 4 steps 12 and 13).
 *
 * The owner's decision 6: a hold never closes by itself. It is proposed by a
 * clock, approved by a person with a notice the client actually receives, and
 * reviewed every thirty days until somebody ends it.
 */
export interface OpsHold {
  id: Id;
  /** The opening in TA this hold is about, and the set that went quiet. */
  openingTaId: string;
  setId: Id | null;
  clientId: Id | null;
  state: string;
  /** Why it went on hold, and why it was lifted. */
  reason: string;
  liftedReason: string | null;
  /** The notice the client was sent, once it is approved. */
  noticeMessageId: Id | null;
  proposedAt: number;
  heldAt: number | null;
  liftedAt: number | null;
  /** When the owner is asked about it again. */
  reviewAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * What the client said they want (15, Phase 3 steps 3 to 5).
 *
 * The fault this record exists for is on the owner's board in his own words:
 * "the requirement was in the TA lead's head". The opening in TA is built from
 * these fields and nothing else.
 */
export interface OpsRequirement {
  id: Id;
  leadId: Id;
  clientId: Id | null;
  clientTaId: string;
  /** The meeting it came out of, which is the only other copy. */
  meetingId: Id | null;
  version: number;
  fields: Record<string, string>;
  /** Worth searching for at that package? A no ends in a kind reply. */
  practical: boolean;
  /** Why it is not practical, and when to ask them again. */
  reason: string | null;
  inviteBackAt: number | null;
  /** When it was handed to TA. */
  openedAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * Our side of an opening in the TA System (15, Phase 3 steps 6 to 9).
 *
 * TA owns the opening; this is what Ops needs to know about it: which
 * requirement it came from, who the primary TA is, which day it is the 100%
 * position, and what stage it is at. The TA id is empty until TA confirms it,
 * because a write to TA is queued and may take a while.
 */
export interface OpsPosition {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: main and backup ops, priority, salary.
  backupOwnerId?: string;
  priority?: "P1" | "P2" | "P3";
  salaryMonthly?: number;
  salaryCurrency?: string;
  requirementId: Id | null;
  clientId: Id | null;
  clientTaId: string;
  /** TA's own opening id, once TA has told us. */
  openingTaId: string | null;
  title: string;
  stage: string;
  /** The TA who owns the search, and the day it is the 100% position. */
  primaryTaId: string | null;
  hundredPercentDay: string | null;
  /** What TA has told us about it, in words, for the client view. */
  taStatus: string | null;
  jdApprovedAt: number | null;
  /**
   * The LinkedIn post the TA made (15, Phase 3 step 16). Mandatory, and the
   * TA System will not let an opening go Live without it, so Ops holds the
   * link and can answer a client who asks where their role is advertised.
   */
  linkedInUrl: string | null;
  linkedInPostedAt: number | null;
  /**
   * How deep the client's shortlist is (15, Phase 4 steps 14 and 15). Kept on
   * the position rather than in a table of its own: only the latest count
   * decides anything, and every change is already in the audit.
   */
  depthStage: string | null;
  shortlistedTotal: number | null;
  pendingCount: number | null;
  depthCheckedAt: number | null;
  handedOverAt: number;
  /** Strategies given to ops people for this position (17 Nov). Optional: older rows have none. */
  strategies?: { id: string; text: string; ownerId: Id; at: number }[];
  /**
   * Candidates added by hand when the TA link is down or the person is not in TA (17 Nov).
   * Kept in Ops only and always shown as "added by hand, not in TA".
   */
  manualCandidates?: { id: string; name: string; email: string; phone: string; note: string; cvFileId: string | null; addedBy: Id; at: number }[];
  /** TA people on this opening besides the Primary TA (17 Nov). Optional: older rows have none. */
  team?: { taId: string; addedBy: Id; addedAt: number }[];
  /** Extra people to write to about this position only, e.g. the hiring team lead (17 Nov). */
  contacts?: { name: string; email: string; phone: string; role: string }[];
  closedAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One week's Talent Pulse (15, Phase 3 steps 14 and 15).
 *
 * Ops compiles the open positions with a line from each TA on a Tuesday;
 * marketing posts it on the Wednesday. Compiled by a clock rather than by
 * somebody remembering, which is why it slipped.
 */
export interface OpsTalentPulseIssue {
  id: Id;
  /** The Tuesday it belongs to, as a readable date. */
  weekOf: string;
  state: string;
  lines: {
    positionId: Id;
    openingTaId: string | null;
    title: string;
    client: string;
    note: string;
    applyAddress: string;
  }[];
  postedAt: number | null;
  postedBy: Id | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One weekly report (15, Phase 3 step 18 and Phase 7 step 9).
 *
 * Built by a Monday clock, read by the TA lead, then sent to the Director.
 * The rows are kept as they were built, so last Monday's report still says
 * what it said last Monday - a report rebuilt from today's data is a
 * different report, and the owner asked for the week's picture.
 */
export interface OpsReport {
  id: Id;
  /** "activePositions" today; the KPI report is Phase 7. */
  kind: string;
  /** The Monday it belongs to, as a readable date. */
  weekOf: string;
  state: string;
  rows: ReportRowRecord[];
  /** What could not be read when it was built, in words. */
  note: string | null;
  builtAt: number;
  approvedBy: Id | null;
  approvedAt: number | null;
  /** The drafted email to the Director, once it is approved. */
  messageId: Id | null;
  sentAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/** One line of a report. The same shape as `ReportRow` in `@/lib/reports`. */
export interface ReportRowRecord {
  positionId: Id;
  openingTaId: string | null;
  client: string;
  title: string;
  primaryTa: string;
  stage: string;
  daysOpen: number;
  counts: Record<string, number> | null;
  shortlisted: number | null;
  setsSent: number;
  lastSentAt: number | null;
  daysWaitingOnClient: number | null;
  decisionsIn: number;
  onHold: boolean;
  depth: string | null;
  advertised: boolean;
}

/**
 * One interview, the client's side of it (15, Phase 5).
 *
 * TA owns the candidate's side and keeps its own interview row; this is what
 * Ops has to answer the client with. `interviewTaId` is TA's row once TA has
 * taken the booking, exactly as a position waits for `openingTaId`.
 */
export interface OpsInterview {
  id: Id;
  /** TA's application, and the opening it belongs to. */
  applicationTaId: string;
  openingTaId: string;
  positionId: Id | null;
  clientId: Id | null;
  candidateName: string;
  /** Who agrees the time: "us" or "client". */
  scheduler: string;
  state: string;
  round: number;
  /** The times the client offered, and the one everybody agreed. */
  slots: number[];
  /**
   * What Ops was told about the candidate for each offered time (16 Nov): free or busy, written by
   * hand from what the TA heard. Never guessed, and missing on older interviews.
   */
  slotAnswers?: { at: number; free: boolean }[];
  slotLoops: number;
  /**
   * Every time a booked interview moved to a new agreed time (16 Nov): the round stays, and this
   * is the history. Missing on older interviews, which never moved.
   */
  reschedules?: { from: number; to: number; by: Id; at: number; reason: string }[];
  at: number | null;
  format: string;
  /** Addresses of the people interviewing, who get the invite. */
  interviewers: string[];
  /** The meeting link, or the address for one at the office. */
  whereOrLink: string;
  interviewTaId: string | null;
  /** Each message this interview has caused, newest last. */
  /** The Outlook event made for it, so a change or a cancel can reach it (17 Nov). */
  calendarEventId?: string | null;
  /** Whose calendar holds it (email) and how long it is, so a move or cancel reaches the right event (21 Nov). */
  calendarOrganiser?: string | null;
  calendarLengthMin?: number | null;
  inviteMessageId: Id | null;
  attendedAt: number | null;
  /** What the client decided after it: next, selected or rejected. */
  decision: string | null;
  decisionReason: string | null;
  decidedAt: number | null;
  /** What the TA heard from the candidate afterwards, as TA worded it. */
  candidateFeedback: string | null;
  /** Why it was cancelled, or why the candidate came out of it. */
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * A reference check, which happens only when the client asks (step 17).
 *
 * No form and no score: the owner settled that on 26 October. The TA phones
 * the referee, writes down what was said, and Ops passes it on as it is.
 */
export interface OpsReferenceRequest {
  id: Id;
  applicationTaId: string;
  openingTaId: string;
  candidateName: string;
  /** Optional candidate phone number recorded for joining/offer calls (19 Nov). */
  candidatePhone?: string | null;
  state: string;
  /** What the TA reported, in the TA's own words. */
  report: string | null;
  requestedAt: number;
  reportedAt: number | null;
  relayMessageId: Id | null;
  /** Cleared or dropped, and why if dropped. */
  decision: string | null;
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * A placement, taken from TA (15, Phase 6 step 3).
 *
 * TA owns the offer and the placement; this is Ops' copy of the few facts the
 * money depends on, with the agreement's fee rule copied onto it so a rule
 * changed next year cannot change an invoice already sent.
 */
export interface OpsPlacement {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: expat fee, nationality, payment details, testimonials.
  expatFeeMonths?: number;
  nationality?: string;
  nationalityFromCv?: string;
  nationalityConfirmedBy?: string;
  nationalityConfirmedAt?: number;
  paymentDetails?: { offeredSalary: number; receivedAt: number; by: string; note?: string };
  testimonial?: { candidate: "pending" | "done"; client: "pending" | "done"; channel?: string; doneAt?: number; by?: string };
  placementTaId: string;
  applicationTaId: string;
  openingTaId: string;
  positionId: Id | null;
  clientId: Id | null;
  candidateName: string;
  /** Optional candidate phone number recorded for joining/offer calls (19 Nov). */
  candidatePhone?: string | null;
  state: string;
  /** What the client agreed to pay them, a month. */
  monthlySalary: number | null;
  /**
   * The split behind monthlySalary (16 Nov): a fee on "basic" or on "gross" needs
   * to know which part is basic. null = TA did not say; the fee then falls back
   * to monthlySalary so nothing is invented.
   */
  basicSalary: number | null;
  /** Monthly allowances on top of basic. Gross = basic + allowances. */
  allowances: number;
  /** TA's free-text package, kept as the candidate was offered it. */
  package: string;
  currency: string;
  offerLetterFileRef: string | null;
  /** The day they are due to start, and the day they really did. */
  joinDate: number | null;
  joinedAt: number | null;
  /** Every time the joining day moved, and why. */
  dojHistory: { from: number | null; to: number; reason: string; at: number; by: Id | null }[];
  /** The agreement's fee rule, as it stood when they were placed. */
  feeMonths: number;
  feeBasis: string;
  /** A replacement under the guarantee is not invoiced again. */
  isReplacementOf: Id | null;
  invoiceId: Id | null;
  /** Why they never joined, or why we lost them. */
  reason: string | null;
  /** What the client chose after a no-show: replace, or stop. */
  noShowChoice: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One invoice (15, Phase 6 steps 9 to 14).
 *
 * The payments live on it rather than in a table of their own: an invoice has
 * one or two, they are only ever read with it, and the audit keeps who
 * recorded what.
 */
export interface OpsInvoice {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: reminders and details request.
  remindersSent?: number;
  detailsRequestedAt?: number;
  number: string;
  /** "fee", "surcharge" or "credit_note". */
  kind: string;
  placementId: Id | null;
  /** What it is about, when there is no placement to read it from. */
  about: string | null;
  /** Start date of an unreported hire when confirmed (19 Nov). */
  hiredStartDate?: string | null;
  /** The set an unreported hire came from, and the invoice a credit note is against. */
  setId: Id | null;
  againstInvoiceId: Id | null;
  clientId: Id | null;
  state: string;
  amount: number;
  currency: string;
  lateCharge: number;
  lateMonths: number;
  /** Nothing is charged on an invoice disputed in good faith. */
  disputed: boolean;
  disputedReason: string | null;
  payments: { amount: number; paidAt: number; method: string; by: Id | null; note: string | null }[];
  sentAt: number | null;
  sentMessageId: Id | null;
  dueAt: number | null;
  paidAt: number | null;
  writtenOffAt: number | null;
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One guarantee (15, Phase 7 steps 2 to 6).
 *
 * Ninety days from joining, and only valid while the fee is fully paid. It is
 * its own row rather than fields on the placement because a replacement
 * starts a new one, and the old one has to stay readable.
 */
export interface OpsGuarantee {
  id: Id;
  placementId: Id;
  openingTaId: string;
  clientId: Id | null;
  candidateName: string;
  /** Optional candidate phone number recorded for joining/offer calls (19 Nov). */
  candidatePhone?: string | null;
  state: string;
  startsAt: number;
  endsAt: number;
  /** When the fee was paid in full; empty means the guarantee is void. */
  feePaidAt: number | null;
  /** The day they left, and why. */
  leftAt: number | null;
  reason: string | null;
  /** Sixty working days from the day they left, to finalise a replacement. */
  deadlineAt: number | null;
  /** The placement that replaced them, once there is one. */
  replacedByPlacementId: Id | null;
  /** The decision, if it came to money. */
  refundPct: number | null;
  refundAmount: number | null;
  decidedBy: Id | null;
  decidedAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * The close checklist (15, Phase 7 steps 11 to 15).
 *
 * The list of things that get forgotten when a position ends, each owned by
 * whoever can actually do it. Nothing closes until every item is ticked.
 */
export interface OpsCloseChecklist {
  id: Id;
  openingTaId: string;
  positionId: Id | null;
  clientId: Id | null;
  /** Why it is closing: a clean end, a refund, a write-off, the client. */
  trigger: string;
  items: { key: string; what: string; whose: string; doneAt: number | null; doneBy: Id | null }[];
  completedAt: number | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One paid advert (15, Phase 3 steps 12 and 13).
 *
 * TopJobs only, today: LinkedIn is recorded on the position and Talent Pulse
 * has its own issue. It is its own row because it has money, a flyer, a date
 * TopJobs gives us and a two-week clock - none of which belongs on a position.
 */
export interface OpsAd {
  id: Id;
  channel: string;
  openingTaId: string;
  positionId: Id | null;
  clientId: Id | null;
  title: string;
  state: string;
  /** Which advert, and what they are charging for it. */
  kind: string;
  cost: number | null;
  /** Marketing's flyer, kept on the Files screen. */
  flyerFileId: Id | null;
  /** The apply address TA routes for this advert, so a CV knows where it came from. */
  applyAlias: string | null;
  orderMessageId: Id | null;
  requestedAt: number;
  orderedAt: number | null;
  liveAt: number | null;
  closesAt: number | null;
  closedAt: number | null;
  /** What TA counted against the advert's own alias. */
  cvCount: number | null;
  reason: string | null;
  ownerId: Id;
  createdAt: number;
  updatedAt: number;
}

/**
 * One run of the AI layer (15, Phase 9 steps 1, 17 and 19).
 *
 * Every ask is written down: the task, the model, what it cost, what it
 * proposed, and what the person did with it. Accuracy and spend are read off
 * these rows rather than guessed, and a year later it says why a record says
 * what it says.
 */
export interface OpsAiRun {
  id: Id;
  task: string;
  provider: string;
  model: string | null;
  /** The records it was given, named so a person can check them. */
  read: string[];
  /** What it proposed, as it came back. */
  proposed: unknown;
  /** "used", "edited", "ignored" or null while nobody has decided. */
  outcome: string | null;
  /** What the person saved, when they edited it - the accuracy sample. */
  kept: unknown;
  ok: boolean;
  because: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  ms: number;
  subjectType: string | null;
  subjectId: Id | null;
  by: Id;
  at: number;
}

/**
 * One line of the desk assistant's thread (8 Nov, docs/31).
 *
 * `who` is the person, the desk (a proposal, a question, a result) or the
 * feed (an email, a clock, a TA event that arrived by itself). A proposal
 * carries its buttons; pressing one runs the action it names and the row
 * moves to done or refused with the gate's own sentence.
 */
export interface OpsChatRow {
  id: Id;
  memberId: Id;
  who: "person" | "desk" | "feed";
  text: string;
  /** `{ label, action, fields }` as the agent rules built them. */
  buttons: { label: string; action: string; fields: Record<string, string>; shows: { label: string; value: string; href: string; field: string }[] }[];
  state: "said" | "proposed" | "running" | "done" | "refused";
  /** The runnable pressed, when one was. */
  actionName: string | null;
  /** The ledger row of the model call that produced it, when one did. */
  runId: Id | null;
  at: number;
  /** The chat it belongs to (9 Nov). Rows from before chats had names have none: "Earlier chat". */
  thread?: Id;
  /** What AURA drew with the words (23 Nov): an A2UI surface, already checked by `parseSurface` (src/lib/a2ui.ts). */
  ui?: string;
}

/** One named chat of a person's (9 Nov): the history list, renamed and deleted by its owner. */
export interface OpsChatThread {
  id: Id;
  memberId: Id;
  name: string;
  at: number;
}

/** One team note posted in Inbox -> Team news (19 Nov). */
export interface OpsTeamNote {
  id: Id;
  authorId: Id;
  body: string;
  createdAt: number;
}

/** One internal Career141 vacancy (H1/H2, 19 Nov). */
export interface OpsVacancy {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: where it came from.
  source?: "scoop" | "job_post" | "referral";
  sourceDetail?: string;
  title: string;
  places: number;
  filled: number;
  status: "open" | "on_hold";
  checks: string[];
  ownerId: Id;
  postedAt: number;
  createdAt: number;
  updatedAt: number;
}

/** One applicant to an internal Career141 vacancy (H2, 19 Nov). */
export interface OpsApplicant {
  id: Id;
  // 26 Nov: the Nov 25 ops meeting: caller and call answers.
  callerId?: string;
  currentSalary?: string;
  expectedSalary?: string;
  availability?: string;
  notInterestedReason?: string;
  vacancyId: Id;
  name: string;
  source: string;
  phone: string | null;
  email: string | null;
  stage: "new" | "call" | "fits" | "interview" | "decision" | "hired" | "rejected" | "non_responsive" | "not_interested" | "shortlisted" | "offered" | "declined";
  tries: number;
  detail: string;
  checkResults: Record<string, string>;
  interviewAt: number | null;
  interviewer: string | null;
  place: string | null;
  score: number | null;
  notes: string | null;
  salary: string | null;
  startDate: string | null;
  rejectReason: string | null;
  /** The stage the person was in when rejected (23 Nov): before the interview is a screening reject, after it a final one. Optional: older rows have none. */
  rejectedAtStage?: string | null;
  cvFileId: Id | null;
  /** Teams link and Outlook event for an online internal interview (21 Nov). */
  joinUrl?: string | null;
  graphEventId?: string | null;
  /**
   * What a Scoop CV gives (23 Nov): the NIC and the position applied for are read from the CV; the package and
   * whether they have a laptop are what Ops asks on the call, so they start empty. All optional: older rows have none.
   */
  nic?: string | null;
  targetPosition?: string | null;
  packageSaid?: string | null;
  laptop?: string | null;
  /** The Scoop batch the CV came in, so its summary can find the people it added. */
  scoopId?: string | null;
  /** When they last wrote back to us on WhatsApp (23 Nov), so a Scoop's summary counts a reply as a response. */
  repliedAt?: number | null;
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
  clients: OpsClient[];
  clientSets: OpsClientSet[];
  holds: OpsHold[];
  requirements: OpsRequirement[];
  positions: OpsPosition[];
  talentPulse: OpsTalentPulseIssue[];
  reports: OpsReport[];
  interviews: OpsInterview[];
  references: OpsReferenceRequest[];
  placements: OpsPlacement[];
  invoices: OpsInvoice[];
  guarantees: OpsGuarantee[];
  closeChecklists: OpsCloseChecklist[];
  ads: OpsAd[];
  aiRuns: OpsAiRun[];
  chat: OpsChatRow[];
  chatThreads: OpsChatThread[];
  meetings: OpsMeeting[];
  agreements: OpsEsa[];
  calls: OpsCallLog[];
  baseline: OpsBaseline[];
  taCalls: OpsTaCall[];
  outbox: OpsOutboxItem[];
  events: OpsEvent[];
  teamNotes: OpsTeamNote[];
  vacancies: OpsVacancy[];
  applicants: OpsApplicant[];
  audit: OpsAuditEntry[];
}
