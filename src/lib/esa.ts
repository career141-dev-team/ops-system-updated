/**
 * The client agreement, which the team calls the ESA (15, Phase 2 steps 9 to 18).
 *
 * This is where the business loses the most time today, and the board says why:
 * an agreement sent late or not at all, chased by hand from somebody's
 * tracker, a copy that came back unsealed and was resent, a draft that went
 * out with placeholders still in it, and a Director countersignature that
 * reached the client months later.
 *
 * So the rules here are deliberately strict about two things: a field that is
 * required may not be blank when the agreement is drafted, and every step of
 * the chase is a fixed plan rather than somebody's memory.
 *
 * Nothing here touches a database or sends anything.
 */

import { fill } from "@/lib/templates";

export type EsaState =
  | "draft"
  | "sent"
  | "chasing"
  | "negotiating"
  | "signed"
  | "countersigned"
  | "declined"
  | "expired";

export const STATE_MEANINGS: Record<EsaState, string> = {
  draft: "Being written",
  sent: "Sent to the client",
  chasing: "Sent, and being chased",
  negotiating: "They want changes",
  signed: "Signed by the client",
  countersigned: "Countersigned by the Director — done",
  declined: "Declined. The search is blocked",
  expired: "Two weeks with no signature",
};

/** Where the agreement can go from where it is. Anything else is refused. */
const NEXT: Record<EsaState, EsaState[]> = {
  draft: ["sent", "declined"],
  sent: ["chasing", "signed", "negotiating", "declined", "expired"],
  chasing: ["signed", "negotiating", "declined", "expired"],
  negotiating: ["sent", "signed", "declined", "expired"],
  signed: ["countersigned", "declined"],
  countersigned: [],
  declined: [],
  expired: ["sent", "declined"],
};

export function canMoveTo(from: EsaState, to: EsaState): boolean {
  return NEXT[from].includes(to);
}

export interface EsaField {
  key: string;
  label: string;
  required: boolean;
  why: string;
}

/**
 * What the agreement is filled from.
 *
 * Every one of these is a hole in the real template, which was read out of the
 * owner's own agreement on 3 Nov: `{{companyName}}`, `{{registrationNo}}` and
 * the rest. The required ones are those that make the document wrong rather
 * than incomplete - a company with no name or no registration number is not a
 * party to anything, and a fee rule nobody wrote down is the argument three
 * months later when the invoice goes out.
 *
 * The tax number is not asked for anywhere in the document, so it is kept but
 * optional; that was my guess before the template was in front of us.
 */
export const ESA_FIELDS: EsaField[] = [
  { key: "companyName", label: "Company, as it signs", required: true, why: "The party to the agreement." },
  // Optional since 17 Nov: the owner's ESA (the Valtrix draft) never prints the client's number.
  { key: "registrationNo", label: "Company registration no.", required: false, why: "Not in the document; kept for the record." },
  { key: "companyAddress", label: "Registered address", required: true, why: "The document needs one." },
  { key: "clientBusiness", label: "What their business is", required: true, why: "“involved in the business of …”, in their words." },
  { key: "signatoryName", label: "Who signs for them", required: true, why: "The person we chase." },
  { key: "signatoryEmail", label: "Their email", required: true, why: "Where the agreement is sent and chased; not printed in it." },
  { key: "signatoryTitle", label: "Their title", required: true, why: "A hole in the agreement: it signs under their designation." },
  { key: "signatoryPhone", label: "Their number", required: true, why: "The WhatsApp chase needs it; the agreement does not print it." },
  { key: "taxNo", label: "Tax number (VAT/TIN)", required: false, why: "Not in the document; kept for the invoice." },
  { key: "feeMonths", label: "Fee: months of salary", required: true, why: "One month is standard." },
  { key: "feeBasis", label: "Fee on gross or basic", required: true, why: "Basic only for selected clients." },
  { key: "guaranteeDays", label: "Guarantee, in days", required: true, why: "90 days from joining." },
  { key: "paymentDays", label: "Payment, in days", required: true, why: "30 days from the first working day." },
  { key: "replacementWorkingDays", label: "Replacement, working days", required: true, why: "60 working days." },
  { key: "refundPct", label: "Refund, per cent", required: true, why: "25% in the agreement (clause 6.6), and only by decision." },
  { key: "notes", label: "Anything agreed on the call", required: false, why: "Kept with the version." },
];

export type EsaFields = Record<string, string>;

/**
 * Which required fields are still blank.
 *
 * The owner's incident: a draft went to a client with placeholders left in it
 * ("Best Pacific", 22 April 2025). A blank required field therefore blocks the
 * draft outright, and the screen lists exactly which ones.
 */
export function missingFields(fields: EsaFields): EsaField[] {
  return ESA_FIELDS.filter((f) => f.required && !(fields[f.key] ?? "").trim());
}

export function problemWithDraft(fields: EsaFields): string | null {
  const missing = missingFields(fields);
  if (missing.length === 0) return null;
  return "Still blank: " + missing.map((f) => f.label.toLowerCase()).join(", ") + ".";
}

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** The holes worded from other fields, and the field a person fixes when one is blank. */
export const WORDED_HOLES: Record<string, string> = {
  feeText: "feeMonths",
  guaranteeText: "guaranteeDays",
  replacementText: "replacementWorkingDays",
};

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];

/** 1 to 99 in words, lower case ("sixty", "forty-five"); blank for anything else. */
function inWords(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return "";
  if (n < 10) return NUMBER_WORDS[n].toLowerCase();
  if (n < 20) return TEENS[n - 10];
  return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + NUMBER_WORDS[n % 10].toLowerCase() : "");
}

/**
 * What the template is filled with (18 Nov): the fields, plus the two lines the
 * owner's draft words in full - "One Month Gross Salary", "90 calendar days
 * (3 months)", "sixty (60) working days". The template had "1 month(s) gross salary" instead, which is not
 * how the agreement reads. A number that cannot be worded leaves the hole blank,
 * so the fill refuses rather than guess.
 */
export function holeValues(fields: EsaFields): EsaFields {
  const months = Number(fields.feeMonths);
  const days = Number(fields.guaranteeDays);
  const basis = (fields.feeBasis ?? "").trim().toLowerCase() === "basic" ? "Basic" : "Gross";
  const feeText =
    Number.isInteger(months) && NUMBER_WORDS[months] ? `${NUMBER_WORDS[months]} ${months === 1 ? "Month" : "Months"} ${basis} Salary` : "";
  const guaranteeText =
    Number.isInteger(days) && days > 0
      ? `${days} calendar days` + (days % 30 === 0 ? ` (${days / 30} ${days === 30 ? "month" : "months"})` : "")
      : "";
  const replacement = Number(fields.replacementWorkingDays);
  const replacementText = inWords(replacement) ? `${inWords(replacement)} (${replacement})` : "";
  return { ...fields, feeText, guaranteeText, replacementText };
}

/** The numbers every agreement starts from, out of the settings. */
export function defaultFields(settings: {
  guaranteeDays: number;
  paymentDays: number;
  replacementWorkingDays: number;
  refundPct: number;
}): EsaFields {
  return {
    feeMonths: "1",
    feeBasis: "gross",
    guaranteeDays: String(settings.guaranteeDays),
    paymentDays: String(settings.paymentDays),
    replacementWorkingDays: String(settings.replacementWorkingDays),
    refundPct: String(settings.refundPct),
  };
}

/**
 * What a new agreement starts from (17 Nov): the settings' numbers and what the
 * lead already says. Shared by the action that starts it and the intro call's
 * form, so the form opens with the same values the agreement would get.
 */
export function startingFields(
  settings: Parameters<typeof defaultFields>[0],
  lead: { company: string; contactName: string; contactEmail: string; contactPhone: string; industry: string },
): EsaFields {
  return {
    ...defaultFields(settings),
    companyName: lead.company,
    signatoryName: lead.contactName,
    signatoryEmail: lead.contactEmail,
    signatoryPhone: lead.contactPhone,
    // A starting point for "involved in the business of ..."; the ops person edits it.
    clientBusiness: lead.industry,
  };
}

export interface ChaseStep {
  step: number;
  channel: "email" | "whatsapp" | "call";
  templateKey: string;
  /** Days after the step before it, from the owner's plan. */
  afterDays: number;
  what: string;
}

/**
 * The chase, exactly as the owner set it out: email, WhatsApp, email,
 * WhatsApp, email, and then a call by a person if it is still stuck.
 *
 * Every one of the first five is drafted for the ops owner to approve - the
 * owner's rule is that nothing written to a client goes without a person - and
 * any reply from the client cancels the rest.
 */
export const CHASE_PLAN: ChaseStep[] = [
  { step: 1, channel: "email", templateKey: "esa.chase.email.1", afterDays: 2, what: "First reminder by email" },
  { step: 2, channel: "whatsapp", templateKey: "esa.chase.wa.1", afterDays: 2, what: "A WhatsApp message" },
  { step: 3, channel: "email", templateKey: "esa.chase.email.2", afterDays: 3, what: "Second reminder by email" },
  { step: 4, channel: "whatsapp", templateKey: "esa.chase.wa.2", afterDays: 2, what: "Another WhatsApp message" },
  { step: 5, channel: "email", templateKey: "esa.chase.email.3", afterDays: 3, what: "Last reminder by email" },
  { step: 6, channel: "call", templateKey: "", afterDays: 2, what: "A call, by a person" },
];

export function chaseStep(step: number): ChaseStep | null {
  return CHASE_PLAN.find((s) => s.step === step) ?? null;
}

/** When the next chase is due, or nothing when the plan has run out. */
export function nextChaseAt(doneSteps: number, from: number): { step: number; dueAt: number } | null {
  const next = chaseStep(doneSteps + 1);
  if (!next) return null;
  return { step: next.step, dueAt: from + next.afterDays * 86_400_000 };
}

/**
 * When an unsigned agreement is given up on.
 *
 * Fourteen calendar days from sending, which is the owner's rule, and calendar
 * days on purpose: the client's two weeks do not pause for our weekend.
 */
export function expiresAt(sentAt: number, days: number): number {
  return sentAt + days * 86_400_000;
}

/** What the screen says is happening, in one line. */
export function whereItStands(esa: {
  state: EsaState;
  chaseStep: number;
  sentAt: number | null;
  expiresAt: number | null;
}, now: number): string {
  if (esa.state === "countersigned") return "Done. The countersigned copy has gone back to the client.";
  if (esa.state === "signed") return "Signed. Waiting for the Director to countersign.";
  if (esa.state === "declined") return "Declined. No work starts for this client.";
  if (esa.state === "expired") return "Two weeks with no signature. Somebody has to decide.";
  if (esa.state === "negotiating") return "They want changes. Agree them, then send a new version.";
  if (esa.state === "draft") return "Not sent yet.";
  const left = esa.expiresAt ? Math.round((esa.expiresAt - now) / 86_400_000) : null;
  const done = esa.chaseStep;
  const next = chaseStep(done + 1);
  return (
    "Sent" +
    (done ? ", chased " + done + (done === 1 ? " time" : " times") : "") +
    (next ? ". Next: " + next.what.toLowerCase() : ". The chase has run out; somebody must call them") +
    (left !== null ? " · " + (left >= 0 ? left + " days left of the two weeks" : "the two weeks are up") : "")
  );
}

/**
 * Why a signed copy cannot be recorded yet.
 *
 * The incident behind this: a copy came back unsealed and had to be resent. We
 * cannot tell a seal from a scan, so what is enforced is that there is a file
 * at all and that somebody says they looked at it.
 */
export function problemWithSigned(input: { fileId: string | null; checked: boolean }): string | null {
  if (!input.fileId) return "Upload the signed copy first, on the files screen.";
  if (!input.checked) return "Tick that you have looked at the copy: signed, dated and sealed.";
  return null;
}

/**
 * The words of one written chase (3 Nov).
 *
 * The screen's button and the clock both draft the same thing, so the wording
 * lives here once rather than in whichever door was built first. A missing
 * address is a problem to say out loud, not a message sent nowhere.
 */
export function chaseDraft(
  plan: ChaseStep,
  fields: EsaFields,
  wording: { subject: string | null; body: string | null } | null,
  fallbackPhone: string | null,
): { to: string; subject: string; body: string } | { problem: string } {
  const client = fields.companyName ?? "";
  const to =
    plan.channel === "email"
      ? String(fields.signatoryEmail ?? "").trim()
      : String(fields.signatoryPhone ?? fallbackPhone ?? "").trim();
  if (!to) return { problem: plan.channel === "email" ? "No email address on the agreement." : "No phone number for this client." };

  return {
    to,
    subject: plan.channel === "email" ? wording?.subject?.replace("{{client}}", client) || "Our agreement" : "",
    body: (wording?.body ?? "Dear {{contact}},\n\nCould you let us know where our agreement stands?\n\nKind regards,\nCareer 141")
      .replace("{{contact}}", fields.signatoryName ?? "")
      .replace("{{client}}", client),
  };
}

/**
 * The cover email that carries the agreement (17 Nov).
 *
 * The owner's cover names this client's fee, payment days and guarantee next
 * to the clause numbers, so it may use any agreement field, plus {{client}}
 * and {{contact}}. A hole left empty stops the send, as in the document.
 */
export function coverDraft(
  wording: { subject: string | null; body: string | null } | null,
  fields: EsaFields,
): { subject: string; body: string } | { problem: string } {
  const out = fill(
    {
      subject: wording?.subject || "{{client}} · our agreement",
      body: wording?.body || "Dear {{contact}},\n\nOur agreement is attached.\n\nKind regards,\nCareer 141",
    },
    { ...fields, client: fields.companyName ?? "", contact: fields.signatoryName ?? "" },
  );
  if (out.missing.length) return { problem: "The cover email has holes nothing fills: " + out.missing.join(", ") + ". Fill them in, or fix the template." };
  return { subject: out.subject, body: out.body };
}

/**
 * The cover email as it will go (17 Nov): the person's own wording when they edited it
 * (kept in the agreement's fields), else the template filled from the agreement. The
 * screen's preview and the send both ask this, so they are always the same words.
 */
export function coverEmail(
  wording: { subject: string | null; body: string | null } | null,
  fields: EsaFields,
): { subject: string; body: string } | { problem: string } {
  const subject = (fields.coverSubject ?? "").trim();
  const body = (fields.coverBody ?? "").trim();
  if (!subject || !body) return coverDraft(wording, fields);
  if (/\{\{/.test(subject + body)) return { problem: "The cover email still has a {{hole}} in it. Fill it in, or reset to the standard wording." };
  return { subject, body };
}

/**
 * The client wants changes (15, Phase 2 step 16).
 *
 * What they want has to be written down, because the next version is drafted
 * from it and because a negotiation nobody recorded is how a term the client
 * never agreed to ends up in a signed agreement.
 */
export function problemWithChanges(what: string): string | null {
  if (what.trim().length < 10) return "Write down what they want changed. The next version is drafted from this.";
  return null;
}

/** Holes the template may have that are not agreement fields: the system fills them. */
const SYSTEM_HOLES = ["effectiveDate"];

/** Fields the owner's ESA never prints but the send and the chase need (17 Nov): where it goes, and the WhatsApp number. */
const NOT_PRINTED = ["signatoryEmail", "signatoryPhone"];

/**
 * What is wrong between a template's holes and the fields we collect (16 Nov).
 *
 * `unknown`: a hole nothing fills, so every send would refuse. `unused`: a
 * required field the template never prints, so somebody fills it in for
 * nothing and the document may be missing it.
 */
export function checkTemplate(holes: string[]): { unknown: string[]; unused: EsaField[] } {
  const known = new Set([...ESA_FIELDS.map((f) => f.key), ...SYSTEM_HOLES]);
  return {
    unknown: holes.filter((h) => !known.has(h)),
    unused: ESA_FIELDS.filter((f) => f.required && !holes.includes(f.key) && !NOT_PRINTED.includes(f.key)),
  };
}

export interface VersionRow {
  version: number;
  file: { id: string; name: string; mime: string; uploadedAt: number };
}

/**
 * The agreement's drafted versions, newest first (17 Nov): one row each, read
 * from the file names ("Agreement - Client - v2.pdf"). The PDF is the row when
 * both were made, because a PDF opens as it is and a Word file is only read.
 */
export function agreementVersions(files: { id: string; name: string; mime: string; uploadedAt: number; kind: string }[]): VersionRow[] {
  const best = new Map<number, VersionRow>();
  for (const f of files) {
    if (f.kind !== "esa_draft") continue;
    const m = /- v(\d+)\.(pdf|docx)$/i.exec(f.name);
    if (!m) continue;
    const v = Number(m[1]);
    const have = best.get(v);
    if (!have || (m[2].toLowerCase() === "pdf" && !have.file.name.toLowerCase().endsWith(".pdf"))) best.set(v, { version: v, file: f });
  }
  return [...best.values()].sort((a, b) => b.version - a.version);
}

/**
 * The number the next drafted copy gets (17 Nov): one past the highest already made, so a
 * second draft after an edit is a new version, not the first one written over.
 */
export function nextDraftVersion(files: Parameters<typeof agreementVersions>[0]): number {
  return Math.max(0, ...agreementVersions(files).map((r) => r.version)) + 1;
}
