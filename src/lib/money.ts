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
 *   - **Late is 1% a month, compounded**, and nothing is charged on an
 *     invoice the client disputes in good faith. That is the agreement, which
 *     the owner made the truth on 3 November.
 *
 * Nothing here touches a database or sends anything.
 */

import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";

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

/** The agreement's late charge: 1% a month, compounded. */
export const LATE_PCT_PER_MONTH = 1;

/** Unpaid this long and somebody has to decide to write it off. */
export const WRITE_OFF_DAYS = 90;

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
export function feeAmount(rule: { feeMonths: number; feeBasis: string }, monthlySalary: number): number {
  const months = rule.feeMonths > 0 ? rule.feeMonths : 1;
  return Math.round(months * monthlySalary * 100) / 100;
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
 * The late charge, as the agreement words it: 1% a month, compounded.
 *
 * Compounded means the charge is on the running total, not on the original
 * amount - which is what "compounded" means and what our board had wrong as a
 * simple 5% until the document was read (3 Nov).
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
