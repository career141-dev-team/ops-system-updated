/**
 * The desk assistant: words into the actions the desk already has
 * (8 Nov, docs/31).
 *
 * The owner's ask: a chat that does the work. A person types "approve the
 * last email"; the system shows one line and a button; the click runs it.
 * Two rules keep that safe, and both live here where a test can hold them:
 *
 *   - **The model never executes.** It turns words into an intent and its
 *     fields, as JSON. Everything after that is rules: which action, which
 *     row, whose permission, what the button says.
 *   - **The rules never guess silently.** "The last email" names the draft
 *     it picked, in the button. A client that is not a whole name is asked
 *     about, not assumed. A money figure comes from the row, never from the
 *     words, unless the field is the person's own entry (a payment received)
 *     and then the figure is on the button before anything runs.
 *
 * The button runs the SAME server action the screen runs, with the same
 * FormData, through the same gate. The chat adds no power; it adds a way in.
 *
 * Part 3 (8 Nov): the rest of the catalogue - the enquiry, the agreement,
 * the position, the set and the client's decision, the interview, the
 * placement, the guarantee, the hold, the advert, the report - and the
 * missing-field turn: when a field is missing the desk asks one question,
 * and the next thing typed is the answer, with no model in between.
 */

import type { OpsDatabase, OpsMember } from "@/data/types";
import { colomboDate } from "@/lib/calendar";
import { LEAD_SOURCES } from "@/lib/leads";
import { type Capability, can, refusal } from "@/lib/roles";
import { clientNamed } from "@/lib/quickAdd";

/** The server actions the chat may run. `actions.ts` must provide every one (the type makes it). */
export const RUNNABLE_NAMES = [
  "approveAndSend",
  "approveAllRoutine",
  "markMailDone",
  "fileThisMail",
  "finishTask",
  "recordCall",
  "quickAdd",
  "writeNewMessage",
  "recordPayment",
  "sendInvoice",
  // part 3
  "readMailNow",
  "runClocksNow",
  "closeLead",
  "startAgreement",
  "sendAgreement",
  "draftNextChase",
  "recordChangesWanted",
  "declineAgreement",
  "moveClientStage",
  "moveClientOwner",
  "recordLinkedInPost",
  "reviewClientSet",
  "sendClientSet",
  "recordSetReceived",
  "recordClientDecision",
  "approveTheHold",
  "liftTheHold",
  "requestInterviewSlots",
  "recordInterviewSlots",
  "recordCandidatePick",
  "recordClientBooking",
  "bookInterview",
  "markInterviewAttendance",
  "recordCandidateOut",
  "cancelInterview",
  "recordRoundDecision",
  "requestReference",
  "markJoined",
  "markNoShow",
  "recordNoShowChoice",
  "changeJoinDate",
  "cancelPlacement",
  "markInvoiceDisputed",
  "writeOffInvoice",
  "raiseCreditNote",
  "recordLeaver",
  "decideRefund",
  "markRefunded",
  "completeClose",
  "requestAd",
  "markAdLive",
  "markAdClosed",
  "dropAd",
  "buildWeeklyReportNow",
  "approveWeeklyReport",
  "compileTalentPulseNow",
  "summariseClient",
] as const;
export type Runnable = (typeof RUNNABLE_NAMES)[number];

/** Where a field's value comes from when the words are resolved against the desk. */
export type FieldFrom =
  | "text"
  | "client"
  | "draft"
  | "task"
  | "invoice"
  | "email"
  | "money"
  | "inbound"
  | "choice"
  | "lead"
  | "agreement"
  | "position"
  | "set"
  | "candidate"
  | "interview"
  | "placement"
  | "guarantee"
  | "hold"
  | "ad"
  | "member"
  | "date"
  | "when"
  | "yesno"
  | "report"
  | "close";

export interface AgentField {
  /** The FormData name the action reads. */
  name: string;
  from: FieldFrom;
  required: boolean;
  /** How the desk asks for it when it is missing. */
  asks: string;
  choices?: readonly string[];
}

export interface AgentAction {
  /** The intent name the model answers with. */
  name: string;
  /** What it does, for the model and for "here is what I can". */
  says: string;
  action: Runnable;
  needs: Capability | null;
  money: boolean;
  fields: AgentField[];
  /** Fixed FormData the screen would also send. */
  fixed?: Record<string, string>;
}

const REASON: AgentField = { name: "reason", from: "text", required: true, asks: "Why? The reason is saved - it is the owner's rule." };

export const AGENT_ACTIONS: AgentAction[] = [
  // ── the day ──────────────────────────────────────────────────────
  {
    name: "approve_draft",
    says: "Approve one waiting draft and send it (the newest when none is named)",
    action: "approveAndSend",
    needs: "message.approve",
    money: false,
    fields: [{ name: "messageId", from: "draft", required: true, asks: "Which draft? Say a word from its subject, or 'the last one'." }],
  },
  { name: "approve_all_routine", says: "Approve every routine notice waiting (drafts from a template a person approved once)", action: "approveAllRoutine", needs: "message.approve", money: false, fields: [] },
  {
    name: "mark_mail_done",
    says: "Mark an email that arrived as dealt with",
    action: "markMailDone",
    needs: "inbox.read",
    money: false,
    fields: [{ name: "inboundId", from: "inbound", required: true, asks: "Which email? Say who it is from, or 'the newest'." }],
  },
  {
    name: "file_mail",
    says: "File an email that arrived under a client",
    action: "fileThisMail",
    needs: "inbox.read",
    money: false,
    fields: [
      { name: "inboundId", from: "inbound", required: true, asks: "Which email? Say who it is from, or 'the newest'." },
      { name: "subject", from: "client", required: true, asks: "Which client should it be filed under?" },
    ],
  },
  { name: "read_mail_now", says: "Read the mailboxes now rather than waiting for the clock", action: "readMailNow", needs: "inbox.read", money: false, fields: [] },
  { name: "run_clocks", says: "Run the clocks now rather than waiting for the next pass", action: "runClocksNow", needs: null, money: false, fields: [] },
  {
    name: "finish_task",
    says: "Mark one of your tasks done, with what happened",
    action: "finishTask",
    needs: "task.do",
    money: false,
    fields: [
      { name: "taskId", from: "task", required: true, asks: "Which task? Say a word from it, or 'the late one'." },
      { name: "outcome", from: "text", required: true, asks: "What happened? One line." },
    ],
  },
  {
    name: "log_call",
    says: "Write down a phone call you made",
    action: "recordCall",
    needs: "task.do",
    money: false,
    fields: [
      { name: "to", from: "text", required: true, asks: "What number did you call?" },
      { name: "spokeTo", from: "text", required: true, asks: "Who did you speak to, or did nobody answer?" },
      { name: "outcome", from: "text", required: true, asks: "What was said? One line." },
      { name: "about", from: "client", required: false, asks: "Which client was it about?" },
    ],
    fixed: { purpose: "other" },
  },
  {
    name: "keep_note",
    says: "Keep a note for yourself; it is on Your day tomorrow morning",
    action: "quickAdd",
    needs: null,
    money: false,
    fields: [
      { name: "text", from: "text", required: true, asks: "What is the note?" },
      { name: "about", from: "client", required: false, asks: "Which client is it about?" },
    ],
    fixed: { kind: "note" },
  },
  {
    name: "write_email",
    says: "Write an email to somebody; it is drafted and waits for approval, nothing sends from here",
    action: "writeNewMessage",
    needs: "message.approve",
    money: false,
    fields: [
      { name: "to", from: "email", required: true, asks: "To which address?" },
      { name: "subject", from: "text", required: true, asks: "What is the subject?" },
      { name: "body", from: "text", required: true, asks: "What should it say?" },
    ],
  },
  // ── the enquiry and the agreement ────────────────────────────────
  {
    name: "new_enquiry",
    says: "Save a new enquiry from a company that got in touch",
    action: "quickAdd",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "company", from: "text", required: true, asks: "Which company?" },
      { name: "contactName", from: "text", required: false, asks: "Who got in touch?" },
      { name: "contactPhone", from: "text", required: false, asks: "Their number?" },
      { name: "contactEmail", from: "email", required: false, asks: "Their email?" },
      { name: "source", from: "choice", required: false, asks: "Where did it come from?", choices: LEAD_SOURCES },
    ],
    fixed: { kind: "enquiry" },
  },
  {
    name: "close_enquiry",
    says: "Close an enquiry that is going nowhere, with the reason",
    action: "closeLead",
    needs: "client.manage",
    money: false,
    fields: [{ name: "leadId", from: "lead", required: true, asks: "Which enquiry? Say the company." }, REASON],
    fixed: { state: "closed_other" },
  },
  {
    name: "start_agreement",
    says: "Draft the agreement for an enquiry and start its clock",
    action: "startAgreement",
    needs: "client.manage",
    money: false,
    fields: [{ name: "leadId", from: "lead", required: true, asks: "Which enquiry? Say the company." }],
  },
  {
    name: "send_agreement",
    says: "Send the drafted agreement to the client",
    action: "sendAgreement",
    needs: "client.manage",
    money: false,
    fields: [{ name: "esaId", from: "agreement", required: true, asks: "Which client's agreement?" }],
  },
  {
    name: "chase_agreement",
    says: "Draft the next chase for an agreement that has not come back",
    action: "draftNextChase",
    needs: "client.manage",
    money: false,
    fields: [{ name: "esaId", from: "agreement", required: true, asks: "Which client's agreement?" }],
  },
  {
    name: "agreement_changes",
    says: "Record that the client wants changes to the agreement",
    action: "recordChangesWanted",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "esaId", from: "agreement", required: true, asks: "Which client's agreement?" },
      { name: "what", from: "text", required: true, asks: "What do they want changed, in their words?" },
    ],
  },
  {
    name: "decline_agreement",
    says: "Decline an agreement the client will not sign, with the reason",
    action: "declineAgreement",
    needs: "client.manage",
    money: false,
    fields: [{ name: "esaId", from: "agreement", required: true, asks: "Which client's agreement?" }, REASON],
  },
  // ── the client ───────────────────────────────────────────────────
  {
    name: "move_client",
    says: "Move a client to active, dormant or closed, with the reason",
    action: "moveClientStage",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "clientId", from: "client", required: true, asks: "Which client?" },
      { name: "stage", from: "choice", required: true, asks: "To which stage?", choices: ["active", "dormant", "closed"] },
      REASON,
    ],
  },
  {
    name: "move_client_owner",
    says: "Give a client to another ops person (the ops lead's call)",
    action: "moveClientOwner",
    needs: "task.reassign",
    money: false,
    fields: [
      { name: "clientId", from: "client", required: true, asks: "Which client?" },
      { name: "ownerId", from: "member", required: true, asks: "To whom? Say the person's name." },
      REASON,
    ],
  },
  {
    name: "summarise_client",
    says: "Have the AI summarise a client's history from our own rows",
    action: "summariseClient",
    needs: "report.read",
    money: false,
    fields: [{ name: "clientId", from: "client", required: true, asks: "Which client?" }],
  },
  // ── the position and the search ──────────────────────────────────
  {
    name: "record_linkedin",
    says: "Record the LinkedIn post for a position",
    action: "recordLinkedInPost",
    needs: "advert.manage",
    money: false,
    fields: [
      { name: "positionId", from: "position", required: true, asks: "Which position? Say the role or the client." },
      { name: "url", from: "text", required: true, asks: "The post's address?" },
    ],
  },
  {
    name: "review_set",
    says: "Start reviewing a CV set that is ready from TA",
    action: "reviewClientSet",
    needs: "client.manage",
    money: false,
    fields: [{ name: "setId", from: "set", required: true, asks: "Which set? Say the client, and the set number if there are several." }],
  },
  {
    name: "send_set",
    says: "Send a reviewed CV set to the client",
    action: "sendClientSet",
    needs: "client.manage",
    money: false,
    fields: [{ name: "setId", from: "set", required: true, asks: "Which set? Say the client, and the set number if there are several." }],
  },
  {
    name: "set_received",
    says: "Record the day the client received a set (the ownership clock starts from it)",
    action: "recordSetReceived",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "setId", from: "set", required: true, asks: "Which set? Say the client, and the set number if there are several." },
      { name: "receivedAt", from: "date", required: true, asks: "On which day? Today, yesterday, or a date." },
    ],
  },
  {
    name: "client_decision",
    says: "Record the client's decision on a candidate in a set, in their words",
    action: "recordClientDecision",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "setId", from: "set", required: true, asks: "Which set? Say the client, and the set number if there are several." },
      { name: "applicationTaId", from: "candidate", required: true, asks: "Which candidate? Say the name." },
      { name: "decision", from: "choice", required: true, asks: "Shortlisted, rejected or hold?", choices: ["shortlisted", "rejected", "hold"] },
      { name: "reason", from: "text", required: true, asks: "In the client's own words, why?" },
    ],
  },
  {
    name: "approve_hold",
    says: "Approve the hold notice proposed for a silent client",
    action: "approveTheHold",
    needs: "client.manage",
    money: false,
    fields: [{ name: "holdId", from: "hold", required: true, asks: "Which client's hold?" }, REASON],
  },
  {
    name: "lift_hold",
    says: "Lift a client's hold now that they are back",
    action: "liftTheHold",
    needs: "client.manage",
    money: false,
    fields: [{ name: "holdId", from: "hold", required: true, asks: "Which client's hold?" }, REASON],
  },
  // ── interviews ───────────────────────────────────────────────────
  {
    name: "ask_slots",
    says: "Ask the client for interview times",
    action: "requestInterviewSlots",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "to", from: "email", required: true, asks: "To which address at the client?" },
    ],
  },
  {
    name: "record_slots",
    says: "Record the times the client offered",
    action: "recordInterviewSlots",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "slots", from: "text", required: true, asks: "Which times did they offer?" },
    ],
  },
  {
    name: "candidate_picked",
    says: "Record the time the candidate picked",
    action: "recordCandidatePick",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "at", from: "when", required: true, asks: "When? A day and a time, like 'Tuesday 10:00' or '2026-11-12 10:00'." },
    ],
  },
  {
    name: "client_booked",
    says: "Record that the client booked the interview themselves, and when",
    action: "recordClientBooking",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "at", from: "when", required: true, asks: "When? A day and a time." },
    ],
  },
  {
    name: "book_interview",
    says: "Book the interview: how, with whom, and where or which link",
    action: "bookInterview",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "format", from: "choice", required: true, asks: "Online or in person?", choices: ["online", "in_person"] },
      { name: "interviewers", from: "text", required: true, asks: "Who is interviewing?" },
      { name: "whereOrLink", from: "text", required: true, asks: "The address, or the meeting link?" },
    ],
  },
  {
    name: "attendance",
    says: "Record whether the candidate came to the interview",
    action: "markInterviewAttendance",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "came", from: "yesno", required: true, asks: "Did they come, yes or no?" },
      { name: "reason", from: "text", required: false, asks: "If not, why?" },
    ],
  },
  {
    name: "candidate_out",
    says: "The candidate dropped out of an interview, with the reason",
    action: "recordCandidateOut",
    needs: "client.manage",
    money: false,
    fields: [{ name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." }, REASON],
  },
  {
    name: "cancel_interview",
    says: "The client cancelled or postponed an interview",
    action: "cancelInterview",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      REASON,
      { name: "again", from: "yesno", required: true, asks: "Will it be rebooked, yes or no?" },
    ],
  },
  {
    name: "round_decision",
    says: "The client's decision after the interview, in their words",
    action: "recordRoundDecision",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "interviewId", from: "interview", required: true, asks: "Which interview? Say the candidate." },
      { name: "decision", from: "choice", required: true, asks: "Selected, next round, or rejected?", choices: ["selected", "next_round", "rejected"] },
      { name: "reason", from: "text", required: true, asks: "In the client's own words, why?" },
    ],
  },
  {
    name: "ask_reference",
    says: "The client asked for a reference on a candidate",
    action: "requestReference",
    needs: "client.manage",
    money: false,
    fields: [{ name: "interviewId", from: "interview", required: true, asks: "Which candidate?" }],
    fixed: { clientAsked: "yes" },
  },
  // ── placement and money ──────────────────────────────────────────
  {
    name: "joined",
    says: "The candidate joined on the day (the fee is drafted at once)",
    action: "markJoined",
    needs: "client.manage",
    money: false,
    fields: [{ name: "placementId", from: "placement", required: true, asks: "Which placement? Say the candidate." }],
  },
  {
    name: "no_show",
    says: "The candidate did not turn up on the joining day",
    action: "markNoShow",
    needs: "client.manage",
    money: false,
    fields: [{ name: "placementId", from: "placement", required: true, asks: "Which placement? Say the candidate." }, REASON],
  },
  {
    name: "no_show_choice",
    says: "After a no-show, the client's choice: replace or stop",
    action: "recordNoShowChoice",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "placementId", from: "placement", required: true, asks: "Which placement? Say the candidate." },
      { name: "choice", from: "choice", required: true, asks: "Replace or stop?", choices: ["replace", "stop"] },
    ],
  },
  {
    name: "move_join_date",
    says: "Move a joining day, with the reason",
    action: "changeJoinDate",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "placementId", from: "placement", required: true, asks: "Which placement? Say the candidate." },
      { name: "joinDate", from: "date", required: true, asks: "To which day?" },
      REASON,
    ],
  },
  {
    name: "cancel_placement",
    says: "Cancel a placement before joining, with the reason",
    action: "cancelPlacement",
    needs: "client.manage",
    money: false,
    fields: [{ name: "placementId", from: "placement", required: true, asks: "Which placement? Say the candidate." }, REASON],
  },
  {
    name: "record_payment",
    says: "Record money received against an invoice",
    action: "recordPayment",
    needs: "money.manage",
    money: true,
    fields: [
      { name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." },
      { name: "amount", from: "money", required: true, asks: "How much was received?" },
      { name: "method", from: "text", required: false, asks: "How was it paid?" },
    ],
  },
  {
    name: "send_invoice",
    says: "Send a drafted invoice to the client's billing address",
    action: "sendInvoice",
    needs: "money.manage",
    money: true,
    fields: [{ name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." }],
  },
  {
    name: "dispute_invoice",
    says: "The client disputes an invoice (no late interest while it is in good faith)",
    action: "markInvoiceDisputed",
    needs: "money.manage",
    money: true,
    fields: [{ name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." }, REASON],
  },
  {
    name: "write_off",
    says: "Write off an invoice (the Director's decision)",
    action: "writeOffInvoice",
    needs: "refund.decide",
    money: true,
    fields: [{ name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." }, REASON],
  },
  {
    name: "credit_note",
    says: "Raise a credit note against an invoice",
    action: "raiseCreditNote",
    needs: "money.manage",
    money: true,
    fields: [
      { name: "invoiceId", from: "invoice", required: true, asks: "Which invoice? Say its number, or the client's name." },
      { name: "amount", from: "money", required: true, asks: "For how much?" },
      { name: "why", from: "text", required: true, asks: "Why?" },
    ],
  },
  // ── the guarantee and the close ──────────────────────────────────
  {
    name: "leaver",
    says: "The placed candidate has left inside the guarantee",
    action: "recordLeaver",
    needs: "client.manage",
    money: false,
    fields: [
      { name: "guaranteeId", from: "guarantee", required: true, asks: "Which guarantee? Say the candidate." },
      { name: "leftAt", from: "date", required: true, asks: "On which day did they leave?" },
      REASON,
    ],
  },
  {
    name: "decide_refund",
    says: "The Director decides the refund",
    action: "decideRefund",
    needs: "refund.decide",
    money: true,
    fields: [{ name: "guaranteeId", from: "guarantee", required: true, asks: "Which guarantee? Say the candidate." }, REASON],
  },
  {
    name: "refunded",
    says: "The refund was paid",
    action: "markRefunded",
    needs: "money.manage",
    money: true,
    fields: [{ name: "guaranteeId", from: "guarantee", required: true, asks: "Which guarantee? Say the candidate." }],
  },
  {
    name: "complete_close",
    says: "Complete a position's close list once every item is ticked",
    action: "completeClose",
    needs: "client.manage",
    money: false,
    fields: [{ name: "checklistId", from: "close", required: true, asks: "Which position's close list? Say the role or the client." }],
  },
  // ── adverts and reports ──────────────────────────────────────────
  {
    name: "request_ad",
    says: "Ask marketing for a TopJobs advert for a position",
    action: "requestAd",
    needs: "advert.manage",
    money: false,
    fields: [{ name: "positionId", from: "position", required: true, asks: "Which position? Say the role or the client." }],
    fixed: { kind: "topjobs" },
  },
  {
    name: "ad_live",
    says: "TopJobs says the advert is live",
    action: "markAdLive",
    needs: "advert.manage",
    money: false,
    fields: [
      { name: "adId", from: "ad", required: true, asks: "Which advert? Say the role." },
      { name: "liveAt", from: "date", required: true, asks: "From which day?" },
    ],
  },
  {
    name: "ad_closed",
    says: "The advert closed; record how many CVs it brought",
    action: "markAdClosed",
    needs: "advert.manage",
    money: false,
    fields: [
      { name: "adId", from: "ad", required: true, asks: "Which advert? Say the role." },
      { name: "cvCount", from: "text", required: true, asks: "How many CVs did it bring?" },
    ],
  },
  {
    name: "drop_ad",
    says: "Drop an advert that will not run, with the reason",
    action: "dropAd",
    needs: "advert.manage",
    money: false,
    fields: [{ name: "adId", from: "ad", required: true, asks: "Which advert? Say the role." }, REASON],
  },
  { name: "build_report", says: "Build this week's report for the Director now", action: "buildWeeklyReportNow", needs: "report.read", money: false, fields: [] },
  {
    name: "approve_report",
    says: "Approve the weekly report so the Director's email is drafted",
    action: "approveWeeklyReport",
    needs: "report.read",
    money: false,
    fields: [{ name: "reportId", from: "report", required: true, asks: "Which week's report?" }],
  },
  { name: "compile_talent_pulse", says: "Compile this week's Talent Pulse now", action: "compileTalentPulseNow", needs: "advert.manage", money: false, fields: [] },
];

/** For the prompt, and for "here is what I can". */
export function catalogueInWords(member?: OpsMember): string[] {
  return AGENT_ACTIONS.filter((a) => !member || !a.needs || can(member, a.needs)).map(
    (a) => a.name + ": " + a.says + (a.fields.length ? " (fields: " + a.fields.map((f) => f.name).join(", ") + ")" : ""),
  );
}

/** What the model answers with. */
export interface AgentIntent {
  intent: string;
  fields: Record<string, string>;
  question: string;
  notSaid: string[];
}

export interface ChatButton {
  label: string;
  action: Runnable;
  fields: Record<string, string>;
  /** "Here is what I will do", as label and value rows, read before pressing. */
  shows: Shown[];
}

/**
 * One row of "Here is what I will do" (polish, 9 Nov). Every claim the
 * desk makes about a record carries the page that proves it (`href`, empty
 * when there is no page), and the field it fills (`field`), so a person can
 * open the source before pressing, and edit that one line by typing.
 */
export interface Shown {
  label: string;
  value: string;
  href: string;
  field: string;
}

export type Resolved =
  | { kind: "proposal"; said: string; buttons: ChatButton[]; intent: AgentIntent }
  /** One question; `pending` is what to carry to the next turn so the answer fills `field`. */
  | { kind: "ask"; said: string; field: string; pending: AgentIntent }
  | { kind: "refuse"; said: string }
  | { kind: "question" };

const LAST = /\b(last|latest|newest|recent|that|this|it)\b/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DAY = 86_400_000;

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9@.]+/).filter((w) => w.length > 1);
}
/**
 * The words a person adds around a name that are not the name: "the Lanka
 * Tiles enquiry" names Lanka Tiles. Found on the first walk, where the model
 * copied the phrase whole and the strict match found nothing.
 */
const FILLER = new Set(["the", "a", "an", "of", "for", "at", "to", "from", "with", "enquiry", "lead", "client", "company", "set", "position", "role", "interview", "placement", "guarantee", "hold", "advert", "ad", "agreement", "esa", "invoice", "candidate", "report", "list", "close"]);
function hasAllWords(hay: string, needle: string): boolean {
  const h = hay.toLowerCase();
  const all = words(needle);
  const ws = all.filter((w) => !FILLER.has(w));
  const use = ws.length ? ws : all;
  return use.length > 0 && use.every((w) => h.includes(w));
}
function lkr(n: number): string {
  return "LKR " + Math.round(n).toLocaleString("en-US");
}

/**
 * A day from words: today, yesterday, tomorrow, a weekday within the week
 * ahead, or a date written as yyyy-mm-dd or dd/mm. Nothing else - a guessed
 * day on a placement or a leaver is a wrong guarantee.
 */
export function dayFrom(text: string, now: number): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/^today$/.test(t)) return colomboDate(now);
  if (/^yesterday$/.test(t)) return colomboDate(now - DAY);
  if (/^tomorrow$/.test(t)) return colomboDate(now + DAY);
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return iso[0];
  const dm = t.match(/^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{4}))?$/);
  if (dm) {
    const y = dm[3] ?? colomboDate(now).slice(0, 4);
    return y + "-" + dm[2].padStart(2, "0") + "-" + dm[1].padStart(2, "0");
  }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const idx = days.findIndex((d) => t.startsWith(d.slice(0, 3)));
  if (idx >= 0) {
    for (let i = 1; i <= 7; i++) {
      const at = now + i * DAY;
      if (new Date(at + 5.5 * 3_600_000).getUTCDay() === idx) return colomboDate(at);
    }
  }
  return null;
}

/** A day and a time, Colombo, as an ISO-like "yyyy-mm-ddThh:mm" the interview screens read. */
export function whenFrom(text: string, now: number): string | null {
  const m = text.trim().match(/^(.*?)\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  const day = dayFrom(m[1] || "today", now);
  if (!day) return null;
  let h = Number(m[2]);
  const min = m[3] ?? "00";
  if (m[4]?.toLowerCase() === "pm" && h < 12) h += 12;
  if (m[4]?.toLowerCase() === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return day + "T" + String(h).padStart(2, "0") + ":" + min;
}

/**
 * Words into a proposal, against the desk as it is now.
 *
 * Every required field must resolve to one row, or the desk asks one
 * question instead of acting - and says which field it is asking about, so
 * the next thing typed can be that answer. Nothing here writes.
 */
export function resolveIntent(got: AgentIntent, db: OpsDatabase, member: OpsMember, now: number): Resolved {
  if (got.intent === "question") return { kind: "question" };
  const action = AGENT_ACTIONS.find((a) => a.name === got.intent);
  if (!action) return refuseIntent(got.intent, member);
  if (action.needs && !can(member, action.needs)) return { kind: "refuse", said: refusal(action.needs) };

  const out: Record<string, string> = { ...(action.fixed ?? {}) };
  const names: string[] = [];
  const shows: Shown[] = [];
  let cur = "";
  const show = (label: string, value: string, href = "") => shows.push({ label, value, href, field: cur });
  const ask = (field: AgentField, said: string): Resolved => ({ kind: "ask", said, field: field.name, pending: got });
  const clientFor = (id: string | null | undefined) => db.clients.find((c) => c.id === id)?.name ?? null;

  // A candidate is found inside the set chosen earlier in the same intent.
  let chosenSetId: string | null = null;

  for (const field of action.fields) {
    cur = field.name;
    const raw = (got.fields[field.name] ?? "").trim();
    switch (field.from) {
      case "text": {
        if (!raw && field.required) return ask(field, field.asks);
        if (raw) {
          out[field.name] = raw;
          show(labelFor(field.name), raw);
        }
        break;
      }
      case "email": {
        if (!raw && field.required) return ask(field, field.asks);
        if (raw && !EMAIL.test(raw)) return ask(field, `"${raw}" does not look like an email address. ${field.asks}`);
        if (raw) {
          out[field.name] = raw;
          show("Email", raw);
        }
        break;
      }
      case "choice": {
        const pick = field.choices?.find((c) => c === raw.toLowerCase().replace(/\s+/g, "_"));
        if (!pick && (raw || field.required)) return ask(field, field.asks + " One of: " + (field.choices ?? []).join(", ") + ".");
        if (pick) {
          out[field.name] = pick;
          show(labelFor(field.name), pick.replace(/_/g, " "));
        }
        break;
      }
      case "yesno": {
        const yes = /^(y|yes|came|did|true)$/i.test(raw);
        const no = /^(n|no|did not|didn't|false)$/i.test(raw);
        if (!yes && !no) return ask(field, field.asks);
        out[field.name] = yes ? "yes" : "no";
        show(labelFor(field.name), yes ? "yes" : "no");
        break;
      }
      case "date": {
        const day = dayFrom(raw, now);
        if (!day) return ask(field, (raw ? `I cannot read "${raw}" as a day. ` : "") + field.asks);
        out[field.name] = day;
        show(labelFor(field.name), day);
        break;
      }
      case "when": {
        const at = whenFrom(raw, now);
        if (!at) return ask(field, (raw ? `I cannot read "${raw}" as a day and time. ` : "") + field.asks);
        out[field.name] = at;
        show("When", at.replace("T", " "));
        break;
      }
      case "money": {
        const n = Number(raw.replace(/[^0-9.]/g, ""));
        if (!raw || !Number.isFinite(n) || n <= 0) return ask(field, field.asks);
        out[field.name] = String(n);
        names.push(lkr(n));
        show("Amount", lkr(n));
        break;
      }
      case "client": {
        if (!raw) {
          if (field.required) return ask(field, field.asks + " I know: " + db.clients.slice(0, 6).map((c) => c.name).join(", ") + ".");
          break;
        }
        const client = clientNamed(raw, db.clients) ?? onlyOne(db.clients.filter((c) => hasAllWords(c.name, raw)));
        if (!client) {
          const near = db.clients.filter((c) => words(raw).some((w) => c.name.toLowerCase().includes(w))).slice(0, 4);
          return ask(field, `I do not know a client called "${raw}".` + (near.length ? " Did you mean: " + near.map((c) => c.name).join(", ") + "?" : ""));
        }
        // fileThisMail wants "type|id"; recordCall wants the subject; quickAdd wants the name; the rest the id.
        if (field.name === "subject") out.subject = "client|" + client.id;
        else if (action.action === "recordCall") {
          out.subjectType = "client";
          out.subjectId = client.id;
          out.toName = client.name;
        } else if (action.action === "quickAdd") out.about = client.name;
        else out[field.name] = client.id;
        names.push(client.name);
        show("Client", client.name, "/clients/" + client.id);
        break;
      }
      case "member": {
        const people = db.members.filter((m) => m.active);
        const pick = onlyOne(people.filter((m) => raw && hasAllWords(m.name, raw)));
        if (!pick) return ask(field, field.asks + " The team: " + people.map((m) => m.name).join(", ") + ".");
        out[field.name] = pick.id;
        show("To", pick.name);
        break;
      }
      case "draft": {
        const drafts = db.messages.filter((m) => m.state === "draft").sort((a, b) => b.createdAt - a.createdAt);
        if (!drafts.length) return { kind: "refuse", said: "Nothing is waiting for approval." };
        const pick = !raw || LAST.test(raw) ? drafts[0] : drafts.find((m) => hasAllWords(m.subject + " " + m.to.join(" "), raw));
        if (!pick) return ask(field, `No waiting draft matches "${raw}". ` + field.asks);
        out[field.name] = pick.id;
        names.push(pick.subject + " to " + pick.to.join(", "));
        show("Draft", pick.subject, "/messages/" + pick.id);
        show("To", pick.to.join(", "));
        break;
      }
      case "task": {
        const mine = db.tasks.filter((t) => t.state === "open" && t.assigneeId === member.id).sort((a, b) => a.dueAt - b.dueAt);
        if (!mine.length) return { kind: "refuse", said: "You have no open tasks." };
        const pick = /\blate\b/i.test(raw) ? mine.find((t) => t.dueAt < now) : !raw || LAST.test(raw) ? mine[0] : mine.find((t) => hasAllWords(t.title + " " + t.body, raw));
        if (!pick) return ask(field, `None of your tasks matches "${raw}". ` + field.asks);
        out[field.name] = pick.id;
        names.push(pick.title);
        show("Task", pick.title, "/tasks/" + pick.id);
        break;
      }
      case "inbound": {
        // Your own box first (9 Nov); the whole desk only when yours is empty.
        const allNew = db.inbound.filter((i) => i.readState === "new").sort((a, b) => b.receivedAt - a.receivedAt);
        const ownNew = allNew.filter((i) => (i.mailbox ?? "").toLowerCase() === (member.email ?? "").toLowerCase());
        const fresh = ownNew.length ? ownNew : allNew;
        if (!fresh.length) return { kind: "refuse", said: "No new email is waiting." };
        const pick = !raw || LAST.test(raw) ? fresh[0] : fresh.find((i) => hasAllWords(i.from + " " + i.fromName + " " + i.subject, raw));
        if (!pick) return ask(field, `No new email matches "${raw}". ` + field.asks);
        out[field.name] = pick.id;
        names.push((pick.fromName || pick.from) + ": " + pick.subject);
        show("Email from", pick.fromName || pick.from, "/mail");
        show("Subject", pick.subject);
        break;
      }
      case "invoice": {
        const open = db.invoices.filter((i) => ["draft", "sent", "partly_paid", "disputed"].includes(i.state));
        let pick = open.find((i) => raw && i.number.toLowerCase() === raw.toLowerCase());
        if (!pick && raw) {
          const client = clientNamed(raw, db.clients) ?? onlyOne(db.clients.filter((c) => hasAllWords(c.name, raw)));
          const theirs = client ? open.filter((i) => i.clientId === client.id) : [];
          if (theirs.length === 1) pick = theirs[0];
          if (theirs.length > 1) return ask(field, `${client?.name} has ${theirs.length} open invoices: ` + theirs.map((i) => i.number).join(", ") + ". Which one?");
        }
        if (!pick) return ask(field, field.asks + (open.length ? " Open: " + open.slice(0, 5).map((i) => i.number).join(", ") + "." : " None is open."));
        out[field.name] = pick.id;
        names.push(pick.number + " (" + (clientFor(pick.clientId) ?? "client unknown") + ", " + lkr(pick.amount) + ")");
        show("Invoice", pick.number, "/invoices/" + pick.id);
        show("Client", clientFor(pick.clientId) ?? "unknown", pick.clientId ? "/clients/" + pick.clientId : "");
        show("Invoice total", lkr(pick.amount));
        break;
      }
      case "lead": {
        const open = db.leads.filter((l) => !l.state.startsWith("closed") && l.state !== "declined_industry");
        const pick = onlyOne(open.filter((l) => raw && hasAllWords(l.company + " " + l.contactName, raw)));
        if (!pick) return ask(field, field.asks + (open.length ? " Open enquiries: " + open.slice(0, 6).map((l) => l.company).join(", ") + "." : " None is open."));
        out[field.name] = pick.id;
        show("Enquiry", pick.company, "/leads/" + pick.id);
        break;
      }
      case "agreement": {
        const rows = db.agreements as unknown as { id: string; leadId: string; state: string }[];
        const live = rows.filter((a) => !["signed", "countersigned", "declined"].includes(a.state));
        const lead = onlyOne(db.leads.filter((l) => raw && hasAllWords(l.company, raw)));
        const pick = lead ? live.filter((a) => a.leadId === lead.id).sort((a, b) => b.id.localeCompare(a.id))[0] : undefined;
        if (!pick) {
          const who = live.map((a) => db.leads.find((l) => l.id === a.leadId)?.company).filter(Boolean);
          return ask(field, field.asks + (who.length ? " Agreements in play: " + who.slice(0, 6).join(", ") + "." : " None is in play."));
        }
        out[field.name] = pick.id;
        show("Agreement", (lead?.company ?? "") + ", " + pick.state, lead ? "/leads/" + lead.id : "");
        break;
      }
      case "position": {
        const open = db.positions.filter((p) => p.stage !== "closed");
        const pick = onlyOne(open.filter((p) => raw && hasAllWords(p.title + " " + (clientFor(p.clientId) ?? ""), raw)));
        if (!pick) return ask(field, field.asks + (open.length ? " Open: " + open.slice(0, 6).map((p) => p.title + " at " + (clientFor(p.clientId) ?? "?")).join("; ") + "." : " None is open."));
        out[field.name] = pick.id;
        show("Position", pick.title + " at " + (clientFor(pick.clientId) ?? "?"), "/positions/" + pick.id);
        break;
      }
      case "set": {
        const live = db.clientSets.filter((s) => s.state !== "withdrawn");
        const number = Number((raw.match(/\bset\s*(\d+)\b/i) ?? raw.match(/\b(\d+)\b/))?.[1] ?? NaN);
        // "the latest nippon set 2": the client is what is left once the set
        // words and the "latest" words are taken out.
        const clientText = raw.replace(/\bsets?\s*\d*\b/gi, "").replace(/\b(the|last|latest|newest|recent|that|this|it)\b/gi, "").trim();
        const client = onlyOne(db.clients.filter((c) => clientText && hasAllWords(c.name, clientText)));
        let candidates = client ? live.filter((s) => s.clientId === client.id) : raw ? live.filter((s) => hasAllWords(s.name, raw)) : [];
        if (Number.isFinite(number)) candidates = candidates.filter((s) => s.setNumber === number);
        const pick = candidates.length === 1 ? candidates[0] : candidates.length > 1 && LAST.test(raw) ? candidates.sort((a, b) => b.setNumber - a.setNumber)[0] : undefined;
        if (!pick) {
          return ask(field, field.asks + (candidates.length > 1 ? " Sets: " + candidates.map((s) => s.name).join("; ") + "." : live.length ? " Sets in play: " + live.slice(0, 6).map((s) => s.name).join("; ") + "." : " None is in play."));
        }
        chosenSetId = pick.id;
        out[field.name] = pick.id;
        show("Set", pick.name, "/sets/" + pick.id);
        break;
      }
      case "candidate": {
        const set = db.clientSets.find((s) => s.id === chosenSetId);
        if (!set) return ask(field, "Which set first?");
        const pick = onlyOne(set.candidates.filter((c) => raw && hasAllWords(c.name, raw)));
        if (!pick) return ask(field, field.asks + " In this set: " + set.candidates.map((c) => c.name).join(", ") + ".");
        out[field.name] = pick.applicationTaId;
        show("Candidate", pick.name, "/sets/" + set.id);
        break;
      }
      case "interview": {
        const live = db.interviews.filter((i) => !["cancelled", "no_show", "attended"].includes(i.state));
        const pool = live.length ? live : db.interviews;
        const pick = onlyOne(pool.filter((i) => raw && hasAllWords(i.candidateName + " " + (clientFor(i.clientId) ?? ""), raw)));
        if (!pick) return ask(field, field.asks + (pool.length ? " Interviews: " + pool.slice(0, 6).map((i) => i.candidateName + " (" + i.state + ")").join("; ") + "." : " None is open."));
        out[field.name] = pick.id;
        show("Interview", pick.candidateName + ", round " + pick.round + ", " + pick.state, "/interviews/" + pick.id);
        break;
      }
      case "placement": {
        const live = db.placements.filter((p) => p.state === "placed" || p.state === "no_show");
        const pool = live.length ? live : db.placements;
        const pick = onlyOne(pool.filter((p) => raw && hasAllWords(p.candidateName + " " + (clientFor(p.clientId) ?? ""), raw)));
        if (!pick) return ask(field, field.asks + (pool.length ? " Placements: " + pool.slice(0, 6).map((p) => p.candidateName + " (" + p.state + ")").join("; ") + "." : " None."));
        out[field.name] = pick.id;
        show("Placement", pick.candidateName + " at " + (clientFor(pick.clientId) ?? "?") + ", " + pick.state, "/placements/" + pick.id);
        break;
      }
      case "guarantee": {
        const pool = db.guarantees;
        const pick = onlyOne(pool.filter((g) => raw && hasAllWords(g.candidateName + " " + (clientFor(g.clientId) ?? ""), raw)));
        if (!pick) return ask(field, field.asks + (pool.length ? " Guarantees: " + pool.slice(0, 6).map((g) => g.candidateName + " (" + g.state + ")").join("; ") + "." : " None."));
        out[field.name] = pick.id;
        show("Guarantee", pick.candidateName + ", " + pick.state, "/guarantees/" + pick.id);
        break;
      }
      case "hold": {
        const live = db.holds.filter((h) => h.state !== "lifted" && h.state !== "closed");
        const client = onlyOne(db.clients.filter((c) => raw && hasAllWords(c.name, raw)));
        const pick = client ? live.find((h) => h.clientId === client.id) : onlyOne(live);
        if (!pick) return ask(field, field.asks + (live.length ? " Holds: " + live.map((h) => clientFor(h.clientId) ?? "?").join(", ") + "." : " None is in play."));
        out[field.name] = pick.id;
        show("Hold", (clientFor(pick.clientId) ?? "?") + ", " + pick.state, "/holds/" + pick.id);
        break;
      }
      case "ad": {
        const live = db.ads.filter((a) => a.state !== "closed" && a.state !== "dropped");
        const pick = onlyOne(live.filter((a) => raw && hasAllWords(a.title + " " + (clientFor(a.clientId) ?? ""), raw)));
        if (!pick) return ask(field, field.asks + (live.length ? " Adverts: " + live.map((a) => a.title + " (" + a.state + ")").join("; ") + "." : " None is running."));
        out[field.name] = pick.id;
        show("Advert", pick.title + ", " + pick.state, "/adverts/" + pick.id);
        break;
      }
      case "report": {
        const rows = (db.reports as unknown as { id: string; weekOf: string; state: string }[]).filter((r) => r.state !== "approved");
        const pick = rows.sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
        if (!pick) return { kind: "refuse", said: "No report is waiting for approval." };
        out[field.name] = pick.id;
        show("Report", "week of " + pick.weekOf, "/reports/" + pick.id);
        break;
      }
      case "close": {
        const titleOf = (c: { positionId: string | null; clientId: string | null }) =>
          (db.positions.find((p) => p.id === c.positionId)?.title ?? "position") + " at " + (clientFor(c.clientId) ?? "?");
        const open = db.closeChecklists.filter((c) => c.completedAt === null);
        const pick = onlyOne(open.filter((c) => raw && hasAllWords(titleOf(c), raw)));
        if (!pick) return ask(field, field.asks + (open.length ? " Open close lists: " + open.map(titleOf).join("; ") + "." : " None is open."));
        out[field.name] = pick.id;
        show("Close list", titleOf(pick), "/closes/" + pick.id);
        break;
      }
    }
  }

  const label = buttonLabel(action, out, names, shows);
  const said = action.money
    ? "This is money. Check the line before you press it."
    : action.action === "writeNewMessage"
      ? "I will draft it. It waits for your approval on the mail screen; nothing sends from here."
      : "Check it, then press the button.";
  return { kind: "proposal", said, buttons: [{ label, action: action.action, fields: out, shows }], intent: got };
}

function onlyOne<T>(rows: T[]): T | undefined {
  return rows.length === 1 ? rows[0] : undefined;
}

function labelFor(name: string): string {
  const known: Record<string, string> = {
    to: "To",
    outcome: "What was said",
    text: "Note",
    body: "Message",
    subject: "Subject",
    reason: "Reason",
    what: "What they want",
    url: "Post",
    slots: "Times offered",
    interviewers: "Interviewing",
    whereOrLink: "Where or link",
    came: "Came",
    again: "Rebook",
    cvCount: "CVs it brought",
    why: "Why",
    method: "Paid by",
    company: "Company",
    contactName: "Who",
    contactPhone: "Number",
    stage: "To",
    decision: "Decision",
    choice: "Choice",
    format: "Format",
    receivedAt: "Received on",
    joinDate: "Joining day",
    leftAt: "Left on",
    liveAt: "Live from",
  };
  return known[name] ?? name[0].toUpperCase() + name.slice(1);
}

function buttonLabel(action: AgentAction, out: Record<string, string>, names: string[], shows: Shown[]): string {
  const first = shows[0]?.value ?? "";
  switch (action.name) {
    case "approve_draft": return "Approve and send: " + names[0];
    case "approve_all_routine": return "Approve every routine notice";
    case "mark_mail_done": return "Mark done: " + names[0];
    case "file_mail": return "File " + names[0] + " under " + names[1];
    case "finish_task": return "Finish: " + names[0];
    case "log_call": return "Write down the call to " + out.to + (names[0] ? " about " + names[0] : "");
    case "keep_note": return "Keep the note" + (names[0] ? " under " + names[0] : "");
    case "new_enquiry": return "Save the enquiry from " + out.company;
    case "write_email": return "Draft an email to " + out.to + ": " + out.subject;
    case "record_payment": return "Record " + names[1] + " against " + names[0];
    case "send_invoice": return "Send invoice " + names[0];
    case "credit_note": return "Credit note of " + names[1] + " against " + names[0];
  }
  // The rest read as "<what it does>: <the thing it is about>".
  const verb = action.says.split(" (")[0].split(";")[0];
  return first ? verb + ": " + first : verb;
}

export function refuseIntent(intent: string, member: OpsMember): Resolved {
  const offers = catalogueInWords(member).slice(0, 3).map((line) => line.split(":")[1]?.split("(")[0].trim());
  return {
    kind: "refuse",
    said: (intent ? `I cannot do "${intent}". ` : "") + "Here is what I can: " + offers.join("; ") + ".",
  };
}

/* ── The missing-field turn (part 3) ───────────────────────────── */

/** What a desk row carries while it waits for an answer, kept in its actionName. */
export const PENDING = "pending:";

export function pendingFrom(actionName: string | null): { intent: AgentIntent; field: string } | null {
  if (!actionName || !actionName.startsWith(PENDING)) return null;
  try {
    return JSON.parse(actionName.slice(PENDING.length)) as { intent: AgentIntent; field: string };
  } catch {
    return null;
  }
}

export function pendingMark(intent: AgentIntent, field: string): string {
  return PENDING + JSON.stringify({ intent, field });
}

/** The next thing typed is the answer: the field filled, the same intent resolved again, no model. */
export function answerPending(pending: { intent: AgentIntent; field: string }, typed: string): AgentIntent {
  return { ...pending.intent, fields: { ...pending.intent.fields, [pending.field]: typed.trim() } };
}

/**
 * A question the model left blank (11 Nov). Asked "how many drafts are waiting
 * for approval?", the model answered `{}` - no intent, no question - and the
 * desk replied with its list of offers instead of "10". When the model names
 * nothing and the person's words read as a question, they are one: the
 * question path answers from the desk's own rows, so nothing is guessed.
 */
export function asQuestion(got: AgentIntent, typed: string): AgentIntent {
  if (got.intent) return got;
  const words = typed.trim();
  const reads = /\?$/.test(words) || /^(how|what|when|where|who|whose|which|why|is|are|was|were|do|does|did|can|could|has|have|any|tell me|show me|list)\b/i.test(words);
  return reads ? { ...got, intent: "question", question: words } : got;
}

/** "never mind", "cancel", "stop": the person wants out of the question. */
export function wantsOut(typed: string): boolean {
  return /^(never ?mind|cancel|stop|forget it|no)\.?$/i.test(typed.trim());
}

/* ── Memory of yesterday (part 4) ──────────────────────────────── */

/**
 * What was done here yesterday, in one line at the top of today. Counted
 * from the thread's own rows, no model: how many things were pressed and
 * done, how many refused, how many asked. A quiet day says so.
 */
export function yesterdayInWords(rows: { who: string; state: string; actionName: string | null; at: number }[], now: number): string | null {
  const day = colomboDate(now - DAY);
  const mine = rows.filter((r) => colomboDate(r.at) === day && r.who === "desk");
  if (!mine.length) return null;
  const done = mine.filter((r) => r.state === "done" && r.actionName && !r.actionName.startsWith("feed:") && !r.actionName.startsWith(PENDING)).length;
  const refused = mine.filter((r) => r.state === "refused").length;
  const asked = mine.filter((r) => r.who === "desk").length;
  const parts = [done + (done === 1 ? " thing done" : " things done")];
  if (refused) parts.push(refused + " refused");
  parts.push(asked + (asked === 1 ? " reply" : " replies"));
  return "Yesterday here: " + parts.join(", ") + ".";
}

/* ── The editable plan, and what comes next (polish, 9 Nov) ────── */

/** A proposal row keeps the intent it was built from, so one line of it can be changed by typing. */
export const PLAN = "plan:";

export function planMark(intent: AgentIntent): string {
  return PLAN + JSON.stringify(intent);
}

export function planFrom(actionName: string | null): AgentIntent | null {
  if (!actionName || !actionName.startsWith(PLAN)) return null;
  try {
    return JSON.parse(actionName.slice(PLAN.length)) as AgentIntent;
  } catch {
    return null;
  }
}

/**
 * "Change reason to they hired elsewhere", "Client: Another Client",
 * "actually the amount is 400000": one line of the plan, by its label or
 * its field, and the new words. Nothing else is read as an edit, so an
 * ordinary sentence typed after a proposal is still a new request.
 */
export function editFrom(typed: string, shows: Shown[]): { field: string; value: string } | null {
  const t = typed.trim();
  const m =
    t.match(/^(?:change|edit|set|make|update|actually,?)\s+(?:the\s+)?(.+?)\s+(?:to|is|should be|=)\s+(.+)$/i) ??
    t.match(/^([A-Za-z][A-Za-z ]{1,24}):\s*(.+)$/);
  if (!m) return null;
  const said = m[1].trim().toLowerCase();
  const row = shows.find((s) => s.field && (s.label.toLowerCase() === said || s.field.toLowerCase() === said));
  return row ? { field: row.field, value: m[2].trim() } : null;
}

/** The plan with one field changed: the same intent, resolved again by the same rules. */
export function withEdit(intent: AgentIntent, edit: { field: string; value: string }): AgentIntent {
  return { ...intent, fields: { ...intent.fields, [edit.field]: edit.value } };
}

/**
 * What to do next, read off the desk as it is: up to three, most pressing
 * first, each a sentence the chat already understands. Shown above the box
 * so the next action is one tap, never a blank page.
 */
export function nextSteps(db: OpsDatabase, member: OpsMember, now: number): { label: string; say: string }[] {
  const out: { label: string; say: string }[] = [];
  const late = db.tasks.filter((t) => t.state === "open" && t.assigneeId === member.id && t.dueAt < now);
  if (late.length && can(member, "task.do")) out.push({ label: "Late task" + (late.length > 1 ? " · " + late.length : ""), say: "finish my late task" });
  const drafts = db.messages.filter((m) => m.state === "draft").length;
  if (drafts && can(member, "message.approve")) out.push({ label: "Approve email · " + drafts, say: "approve the last email" });
  // Your own box (9 Nov): the shared boxes are everybody's and nobody's next step.
  const ownBox = (member.email ?? "").toLowerCase();
  const fresh = db.inbound.filter((i) => i.readState === "new" && (i.mailbox ?? "").toLowerCase() === ownBox).length;
  if (fresh && can(member, "inbox.read")) out.push({ label: "Mark email done · " + fresh, say: "mark the newest email done" });
  const ready = db.clientSets.filter((s) => s.state === "ready");
  if (ready.length && can(member, "client.manage")) {
    const client = db.clients.find((c) => c.id === ready[0].clientId)?.name;
    if (client) out.push({ label: client + " set", say: "review the latest " + client + " set" });
  }
  const report = (db.reports as unknown as { state: string }[]).some((r) => r.state !== "approved" && r.state !== "sent");
  if (report && can(member, "report.read")) out.push({ label: "Weekly report", say: "approve the weekly report" });
  return out.slice(0, 3);
}
