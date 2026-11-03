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
 * The required ones are those that make the document wrong rather than
 * incomplete: a company with no name or no tax number is not a party to
 * anything, and a fee rule nobody wrote down is the argument three months
 * later when the invoice goes out.
 */
export const ESA_FIELDS: EsaField[] = [
  { key: "companyName", label: "Company, as it signs", required: true, why: "The party to the agreement." },
  { key: "companyAddress", label: "Registered address", required: true, why: "The document needs one." },
  { key: "taxNo", label: "Tax number (VAT/TIN)", required: true, why: "Asked for on every agreement." },
  { key: "signatoryName", label: "Who signs for them", required: true, why: "The person we chase." },
  { key: "signatoryEmail", label: "Their email", required: true, why: "Where it is sent and chased." },
  { key: "signatoryTitle", label: "Their title", required: false, why: "Shown under the signature." },
  { key: "feeMonths", label: "Fee: months of salary", required: true, why: "One month is standard." },
  { key: "feeBasis", label: "Fee on gross or basic", required: true, why: "Basic only for selected clients." },
  { key: "guaranteeDays", label: "Guarantee, in days", required: true, why: "90 days from joining." },
  { key: "paymentDays", label: "Payment, in days", required: true, why: "30 days from the first working day." },
  { key: "replacementWorkingDays", label: "Replacement, working days", required: true, why: "60 working days." },
  { key: "refundPct", label: "Refund, per cent", required: true, why: "25%, and only by decision." },
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
