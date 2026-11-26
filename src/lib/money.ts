/**
 * From the placement to the money (15, Phase 6).
 *
 * The TA System makes the placement: it holds the offer, the package, the
 * offer letter and the joining day, and the search stops there. Ops does what
 * happens next, which is the part that pays for everything:
 *
 *   - **The same day, not months later.** Today the accounts side hears about
 *     a placement when somebody remembers to say so; the owner's own note is
 *     that Asma learns months afterwards. The notice goes the day TA places.
 *   - **The joining day is checked, not assumed.** A candidate who never
 *     turns up is a different thing from one who joins, and the client has to
 *     choose what happens next.
 *   - **The fee is the agreement's, not today's opinion.** The rule is copied
 *     onto the placement when it is made, so an agreement changed next year
 *     does not change an invoice already sent.
 *   - **Late is 5% a month, compounded**, and nothing is charged on an
 *     invoice the client disputes in good faith. That is clause 5.5 of the
 *     current agreement (17 November); it was 1% from 3 November, from an
 *     older draft.
 *
 * Nothing here touches a database or sends anything.
 */

import { COLOMBO_OFFSET_MS, DAY, colomboDate } from "@/lib/calendar";

export type PlacementState = "placed" | "joined" | "no_show" | "cancelled";

export const PLACEMENT_MEANINGS: Record<PlacementState, string> = {
  placed: "Placed, not joined yet",
  joined: "Joined",
  no_show: "Did not turn up",
  cancelled: "Lost before joining",
};

export type InvoiceState = "draft" | "sent" | "partly_paid" | "paid" | "written_off";

export const INVOICE_MEANINGS: Record<InvoiceState, string> = {
  draft: "Drafted, waiting for accounts",
  sent: "Sent to the client",
  partly_paid: "Part paid",
  paid: "Paid in full",
  written_off: "Written off",
};

/** Days after the first working day that a fee invoice is due. */
export const DUE_DAYS = 30;

/** The agreement's late charge (clause 5.5, 17 Nov): 5% a month, compounded. */
export const LATE_PCT_PER_MONTH = 5;

/** Unpaid this long and somebody has to decide to write it off. */
export const WRITE_OFF_DAYS = 90;

/** Default expat fee when an agreement did not record one (clause 5.2, 26 Nov). */
export const EXPAT_FEE_MONTHS = 2;

/**
 * Whether a candidate's nationality is non-Sri Lankan (26 Nov, Nov 25 ops meeting).
 *
 * Blank or unknown is never assumed expat: Ops confirms nationality before the
 * invoice goes out. Any non-empty nationality other than Sri Lankan counts as expat.
 */
export function isExpat(nationality: string | null | undefined): boolean {
  // 26 Nov (PR 3 review): letters only, so "Sri-Lankan." or "SRI LANKAN citizen" is never billed as expat.
  const n = (nationality ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!n) return false;
  if (n.includes("srilanka") || ["lankan", "sinhala", "sinhalese", "ceylonese", "sl"].includes(n)) return false;
  return true;
}

/**
 * The nationality to store from the confirm form (26 Nov, PR 3 review): an explicit choice, never a guess.
 * "local" stores "Sri Lankan"; "expat" needs a nationality that does not read as Sri Lankan.
 */
export function nationalityFromChoice(kind: string, typed: string): { ok: true; nationality: string } | { ok: false; what: string } {
  if (kind === "local") return { ok: true, nationality: "Sri Lankan" };
  if (kind !== "expat") return { ok: false, what: "Pick Sri Lankan or Not Sri Lankan." };
  const t = typed.trim();
  if (!t) return { ok: false, what: "Type the nationality for a candidate who is not Sri Lankan." };
  if (!isExpat(t)) return { ok: false, what: "That reads as Sri Lankan. Pick Sri Lankan, or type their real nationality." };
  return { ok: true, nationality: t };
}

/**
 * The number of months of salary billed for a placement (26 Nov, Nov 25 ops meeting).
 *
 * An expat placement gets the agreement's `expatFeeMonths` (default 2, clause 5.2);
 * a Sri Lankan (or not-yet-confirmed) placement gets `feeMonths` (default 1).
 */
export function feeMonthsFor(placement: {
  feeMonths: number;
  expatFeeMonths?: number;
  nationality?: string;
}): number {
  if (isExpat(placement.nationality)) {
    return placement.expatFeeMonths && placement.expatFeeMonths > 0 ? placement.expatFeeMonths : EXPAT_FEE_MONTHS;
  }
  return placement.feeMonths > 0 ? placement.feeMonths : 1;
}

/**
 * What still blocks a fee invoice from being sent (26 Nov, Nov 25 ops meeting).
 *
 * The draft is created on join so nothing is forgotten, but it cannot go to the
 * client until Ops confirms nationality (which decides 1 vs 2 months) and the
 * client sends payment details with the actual offered salary (clause 2.12).
 */
export function invoiceBlockers(
  placement:
    | {
        nationality?: string;
        nationalityConfirmedAt?: number;
        paymentDetails?: { offeredSalary: number; receivedAt: number; by: string; note?: string };
      }
    | null
    | undefined,
): string[] {
  if (!placement) return [];
  const blockers: string[] = [];
  if (!placement.nationality?.trim() || !placement.nationalityConfirmedAt) {
    blockers.push("nationality not confirmed");
  }
  if (!placement.paymentDetails || !(placement.paymentDetails.offeredSalary > 0)) {
    blockers.push("payment details not received");
  }
  return blockers;
}

/**
 * The three payment reminders after an invoice is sent: weeks 1, 2 and 3 (26 Nov).
 *
 * Any reminder that would fall on or after the due date is skipped, because the
 * late payment chase takes over once the due date arrives.
 */
export function invoiceReminderClocks(
  sentAt: number,
  dueAt: number | null,
): { kind: string; week: number; dueAt: number }[] {
  const weeks = [1, 2, 3];
  return weeks
    .map((week) => ({ kind: "invoice.remind", week, dueAt: sentAt + week * 7 * DAY }))
    .filter((r) => dueAt === null || r.dueAt < dueAt);
}

/**
 * When the first late chase runs (26 Nov, PR 3 review). An invoice sent after its due date is not
 * chased at once: the first chase is a week after sending. The late charge still counts from dueAt (clause 5.5).
 */
export function firstChaseAt(dueAt: number, sentAt: number): number {
  return dueAt > sentAt ? dueAt : sentAt + 7 * DAY;
}

/**
 * The salary split to store when the client sends their payment details (26 Nov, PR 3 review).
 *
 * Never overwrites a known split silently: a typed basic wins; a blank basic keeps the existing split when it
 * still adds up to the offered salary; otherwise an agreement that bills on basic must be given one.
 */
export function splitFromPaymentDetails(
  offered: number,
  givenBasic: number | null,
  existing: { basicSalary?: number | null; allowances?: number | null },
  feeBasis: string,
): { ok: true; basicSalary: number; allowances: number } | { ok: false; what: string } {
  if (givenBasic !== null && givenBasic > 0) {
    if (givenBasic > offered) return { ok: false, what: "The basic salary cannot be more than the offered salary." };
    return { ok: true, basicSalary: givenBasic, allowances: offered - givenBasic };
  }
  const b = existing.basicSalary ?? 0;
  const a = existing.allowances ?? 0;
  if (b > 0 && b + a === offered) return { ok: true, basicSalary: b, allowances: a };
  if (feeBasis === "basic") {
    return { ok: false, what: "This agreement bills on basic salary. Give the basic as well as the offered salary." };
  }
  return { ok: true, basicSalary: offered, allowances: 0 };
}

/**
 * Whole days left until the due date (positive = days left, 0 = due today, negative = days late).
 */
export function daysUntilDue(dueAt: number | null, now = Date.now()): number | null {
  if (dueAt === null) return null;
  const diff = dueAt - now;
  return diff >= 0 ? Math.ceil(diff / DAY) : -Math.floor((now - dueAt) / DAY);
}

export const TESTIMONIAL_CHANNELS = ["LinkedIn", "Site", "Google"] as const;
export type TestimonialChannel = (typeof TESTIMONIAL_CHANNELS)[number];

export function problemWithTestimonial(side: string, channel: string): string | null {
  if (side !== "candidate" && side !== "client") return "Pick whether this testimonial is from the candidate or the client.";
  if (!channel.trim()) return "Pick which channel it came through (LinkedIn, Site or Google).";
  return null;
}

/**
 * What TA must have sent with a placement.
 *
 * TA refuses Place without the package and the offer letter since 2 November,
 * but an older placement may lack them, and an invoice cannot be built on a
 * package nobody wrote down.
 */
export function missingPlacementFields(placement: {
  monthlySalary: number | null;
  offerLetterFileRef: string | null;
  joinDate: number | null;
}): string[] {
  const missing: string[] = [];
  if (!placement.monthlySalary || placement.monthlySalary <= 0) missing.push("the agreed package");
  if (!placement.offerLetterFileRef) missing.push("the signed offer letter");
  if (!placement.joinDate) missing.push("the joining day");
  return missing;
}

/** Nine in the morning, Colombo, on the day a number of days from one. */
export function nineAmOn(at: number, daysAway = 0): number {
  const here = new Date(at + daysAway * DAY + COLOMBO_OFFSET_MS);
  return Date.UTC(here.getUTCFullYear(), here.getUTCMonth(), here.getUTCDate(), 9) - COLOMBO_OFFSET_MS;
}

/**
 * The two reminders before the joining day, and the check on the day.
 *
 * A week out and the day before, because that is when a candidate who is
 * wobbling can still be saved, and on the morning itself the TA phones them.
 * A reminder whose day has already gone is left out rather than firing at
 * once.
 */
export function joinClocks(joinDate: number, now = Date.now()): { kind: string; dueAt: number }[] {
  const wanted = [
    { kind: "doj.remind.week", dueAt: nineAmOn(joinDate, -7) },
    { kind: "doj.remind.day", dueAt: nineAmOn(joinDate, -1) },
    { kind: "doj.join", dueAt: nineAmOn(joinDate) },
  ];
  return wanted.filter((one) => one.dueAt > now);
}

export function problemWithDojChange(newDate: number, reason: string, now = Date.now()): string | null {
  if (!Number.isFinite(newDate)) return "Give the new joining day.";
  if (newDate < now - 7 * DAY) return "That day has long gone. If they joined, mark them joined instead.";
  if (reason.trim().length < 4) return "Write why it moved. A joining day that slips twice is the thing we watch for.";
  return null;
}

/**
 * The fee, from the agreement's own rule.
 *
 * One month of salary is standard; basic rather than gross for a few clients;
 * two months for a candidate who is not Sri Lankan. All three come off the
 * agreement, copied onto the placement when it was made.
 */
export function feeAmount(
  rule: { feeMonths: number; feeBasis: string },
  monthlySalary: number,
  split?: { basicSalary?: number | null; allowances?: number | null },
): number {
  const months = rule.feeMonths > 0 ? rule.feeMonths : 1;
  return Math.round(months * salaryForFee(rule.feeBasis, monthlySalary, split) * 100) / 100;
}

/**
 * The monthly figure the fee is a multiple of (16 Nov).
 *
 * "basic" takes basic alone; anything else takes gross = basic + allowances.
 * When the split is unknown the salary TA gave is used as it stands - never a
 * guess at what part of it is basic.
 */
export function salaryForFee(
  feeBasis: string,
  monthlySalary: number,
  split?: { basicSalary?: number | null; allowances?: number | null },
): number {
  const basic = split?.basicSalary;
  if (basic === null || basic === undefined || !(basic > 0)) return monthlySalary;
  return feeBasis === "basic" ? basic : basic + (split?.allowances ?? 0);
}

/** Why the split may be changed after the fact: it moves an invoice. */
export function problemWithSalarySplit(basic: number, allowances: number, reason: string): string | null {
  if (!(basic > 0)) return "Give the basic salary as a number above zero.";
  if (!(allowances >= 0)) return "Allowances cannot be negative. Use 0 for none.";
  if (reason.trim().length < 4) return "Write why the split changed. The fee follows it.";
  return null;
}

export function feeInWords(rule: { feeMonths: number; feeBasis: string }): string {
  const months = rule.feeMonths === 1 ? "one month" : rule.feeMonths + " months";
  return months + " of " + (rule.feeBasis === "basic" ? "basic salary" : "gross salary");
}

/** The invoice number: our series, the year, and a number that only goes up. */
export function invoiceNumber(series: string, count: number, at = Date.now()): string {
  const year = new Date(at + COLOMBO_OFFSET_MS).getUTCFullYear();
  return (series || "C141") + "-" + year + "-" + String(count + 1).padStart(4, "0");
}

/** Due thirty days after the first working day, not after the invoice. */
export function dueOn(joinedAt: number, days = DUE_DAYS): number {
  return joinedAt + days * DAY;
}

/** Whole months an invoice has been overdue; part of a month does not count. */
export function monthsLate(dueAt: number, now = Date.now()): number {
  if (now <= dueAt) return 0;
  return Math.floor((now - dueAt) / (30 * DAY));
}

/**
 * The late charge, as the agreement words it: 5% a month, compounded.
 *
 * Compounded means the charge is on the running total, not on the original
 * amount - which is what "compounded" means and what our board had wrong as a
 * simple rate until the document was read (3 Nov).
 *
 * A disputed invoice carries no charge at all, also from the agreement.
 */
export function lateCharge(
  amount: number,
  months: number,
  pctPerMonth = LATE_PCT_PER_MONTH,
  compounded = true,
  disputed = false,
): number {
  if (disputed || months <= 0 || amount <= 0) return 0;
  const rate = pctPerMonth / 100;
  const total = compounded ? amount * Math.pow(1 + rate, months) : amount * (1 + rate * months);
  return Math.round((total - amount) * 100) / 100;
}

export interface InvoiceLike {
  amount: number;
  lateCharge: number;
  payments: { amount: number }[];
}

export function paidSoFar(invoice: InvoiceLike): number {
  return Math.round(invoice.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
}

export function balanceOf(invoice: InvoiceLike): number {
  return Math.round((invoice.amount + invoice.lateCharge - paidSoFar(invoice)) * 100) / 100;
}

/** A payment has to be real money against something still owed. */
/**
 * Whether an invoice can take money at all (18 Nov: a draft could be marked paid, so a guarantee held on a fee
 * the client had never been sent).
 */
export function problemWithPaymentOn(state: string): string | null {
  if (state === "draft") return "This invoice has not gone to the client yet. Send it first.";
  if (state === "paid") return "This invoice is paid already.";
  if (state === "written_off") return "This invoice is written off.";
  if (state === "credit_note") return "A credit note is not paid; it is set against an invoice.";
  return null;
}

export function problemWithPayment(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "How much did they pay?";
  if (balance <= 0) return "Nothing is owed on this invoice.";
  // More than the balance is usually a typed digit too many, and an invoice
  // that says it was overpaid is worse than one that waits for a correction.
  if (amount > balance + 0.5) {
    return "That is more than the " + money(balance) + " still owed. Check the amount, or record it as two payments.";
  }
  return null;
}

/**
 * The day the money arrived, from the date on the payment form (17 Nov). The forms always sent it and
 * the action ignored it, so every payment read as "today". Blank means today; a date in the future is
 * a typing slip and is refused; a past day is taken at midday in Colombo.
 */
export function paymentDate(input: string, now: number): { at: number; problem: string | null } {
  const text = input.trim();
  if (!text) return { at: now, problem: null };
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
    return { at: now, problem: "Pick the day the money arrived." };
  }
  const today = colomboDate(now);
  if (text > today) return { at: now, problem: "That day has not come yet. Pick the day the money arrived." };
  return { at: text === today ? now : Date.parse(text + "T12:00:00+05:30"), problem: null };
}

export function problemWithWriteOff(dueAt: number, reason: string, now = Date.now(), after = WRITE_OFF_DAYS): string | null {
  if (reason.trim().length < 4) return "Write why it is being written off. This one is read a year later.";
  const days = Math.floor((now - dueAt) / DAY);
  if (days < after) {
    return (
      "It has been " +
      Math.max(0, days) +
      " days since it was due. A fee is not written off before " +
      after +
      " days - chase it, or the Director decides early."
    );
  }
  return null;
}

/** Money, written the way an invoice writes it. */
/** "LKR 412,500": a tile's amount, without the cents the frames never show (249:13655). */
export function moneyWhole(amount: number, currency = "LKR"): string {
  return currency + " " + (Number.isInteger(amount) ? amount.toLocaleString("en-US") : amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

/** "LKR 2.1m", "LKR 640k": a total on the Finance screen, big enough to read at a glance (283:3343). */
export function moneyCompact(amount: number, currency = "LKR"): string {
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (amount >= 1_000_000) return currency + " " + trim(amount / 1_000_000) + "m";
  if (amount >= 1_000) return currency + " " + Math.round(amount / 1_000) + "k";
  return currency + " " + Math.round(amount);
}

export function money(amount: number, currency = "LKR"): string {
  return currency + " " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The invoice as the client reads it.
 *
 * Lines rather than a drawn table: the owner's rule is no spreadsheets, and
 * these go in the body of an email. The real invoice document waits on a
 * template from the owner, exactly as the agreement did - we do not invent
 * the paperwork a client pays against.
 */
export function invoiceLines(invoice: {
  number: string;
  candidateName: string;
  positionTitle: string;
  clientName: string;
  feeWords: string;
  monthlySalary: number;
  amount: number;
  lateCharge: number;
  payments: { amount: number; paidAt: number }[];
  joinedAt: number | null;
  dueAt: number | null;
  currency: string;
}): string {
  const lines = [
    "Invoice " + invoice.number,
    "",
    invoice.clientName,
    invoice.positionTitle + " - " + invoice.candidateName,
    "",
    "Placement fee: " + invoice.feeWords + " of " + money(invoice.monthlySalary, invoice.currency),
    "Amount: " + money(invoice.amount, invoice.currency),
  ];
  if (invoice.lateCharge > 0) {
    lines.push("Late payment charge: " + money(invoice.lateCharge, invoice.currency));
  }
  const paid = paidSoFar({ ...invoice });
  if (paid > 0) lines.push("Received: " + money(paid, invoice.currency));
  lines.push("Due: " + money(balanceOf({ ...invoice }), invoice.currency));
  if (invoice.dueAt) lines.push("Payable by: " + new Date(invoice.dueAt + COLOMBO_OFFSET_MS).toISOString().slice(0, 10));
  return lines.join("\n");
}

export const NO_SHOW_CHOICES: Record<string, string> = {
  replace: "Find a replacement - the search reopens",
  stop: "Stop - the position closes",
};

/**
 * A candidate who never turned up: nothing is invoiced and nothing refunded.
 *
 * The owner's rule. There is no fee because there was no placement, so the
 * client chooses between a replacement and stopping, and the reason is kept
 * either way.
 */
export function problemWithNoShow(reason: string): string | null {
  if (reason.trim().length < 4) return "Write what happened, as far as anybody knows.";
  return null;
}

export function problemWithNoShowChoice(choice: string): string | null {
  if (!(choice in NO_SHOW_CHOICES)) return "Did the client ask for a replacement, or to stop?";
  return null;
}

/** Where a placement stands, in one line. */
export function placementInWords(
  placement: {
    state: string;
    joinDate: number | null;
    joinedAt: number | null;
    isReplacementOf: string | null;
  },
  now = Date.now(),
): string {
  const bits = [PLACEMENT_MEANINGS[placement.state as PlacementState] ?? placement.state];
  if (placement.state === "placed" && placement.joinDate) {
    const left = placement.joinDate - now;
    bits.push(
      left > 0
        ? "joins in " + Math.max(1, Math.round(left / DAY)) + (Math.round(left / DAY) === 1 ? " day" : " days")
        : "the joining day has passed - did they turn up?",
    );
  }
  if (placement.state === "joined" && placement.joinedAt) {
    bits.push("joined " + new Date(placement.joinedAt + COLOMBO_OFFSET_MS).toISOString().slice(0, 10));
  }
  if (placement.isReplacementOf) bits.push("a replacement, so nothing is invoiced");
  return bits.join(" · ");
}

/** Where an invoice stands, in one line. */
export function invoiceInWords(
  invoice: InvoiceLike & { number: string; state: string; dueAt: number | null; currency: string },
  now = Date.now(),
): string {
  // Not the number: every screen that shows this line shows the number
  // beside it as the link, and it read twice over (3 Nov, in the browser).
  const bits = [INVOICE_MEANINGS[invoice.state as InvoiceState] ?? invoice.state];
  const balance = balanceOf(invoice);
  // A draft owes nothing: it has not been sent. Saying "owed" of one reads
  // as though the client were already late.
  if (invoice.state !== "draft" && invoice.state !== "written_off" && balance > 0) {
    bits.push(money(balance, invoice.currency) + " owed");
    if (invoice.dueAt) {
      const days = Math.floor((now - invoice.dueAt) / DAY);
      bits.push(days > 0 ? days + (days === 1 ? " day late" : " days late") : "due in " + -days + " days");
    }
  }
  if (invoice.state === "draft") {
    bits.push(money(invoice.amount, invoice.currency));
    if (invoice.dueAt) bits.push("payable by " + new Date(invoice.dueAt + COLOMBO_OFFSET_MS).toISOString().slice(0, 10));
  }
  if (invoice.state === "paid") bits.push(money(invoice.amount + invoice.lateCharge, invoice.currency) + " collected");
  return bits.join(" · ");
}
