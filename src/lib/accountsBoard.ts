/**
 * The Accounts board (v6 frame A1, 19 Nov): every invoice in the column where it stands, and the
 * numbers above and beside it. Pure: the page reads the desk and hands the rows in, so every
 * rule here is a plain test.
 */
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";

export interface BoardInvoice {
  id: string;
  number: string;
  kind: string;
  state: string;
  amount: number;
  lateCharge: number;
  payments: { amount: number; paidAt: number }[];
  dueAt: number | null;
  sentAt: number | null;
  paidAt: number | null;
  disputed: boolean;
}

export type Column = "to_send" | "sent" | "late" | "paid";

export type InvoiceFilter = "all" | "paid" | "unpaid" | "late";

/** Which board columns a `?show=` filter displays (26 Nov, Nov 25 ops meeting). */
export function columnsForFilter(filter: InvoiceFilter): Column[] {
  if (filter === "paid") return ["paid"];
  if (filter === "unpaid") return ["to_send", "sent", "late"];
  if (filter === "late") return ["late"];
  return ["to_send", "sent", "late", "paid"];
}

/**
 * Whether an invoice matches a `?show=` filter.
 *
 * When `?show=paid` is explicitly chosen, every paid invoice shows (not only this
 * month's), so accounts can look back at settled bills.
 */
export function matchesFilter(i: BoardInvoice, filter: InvoiceFilter, now: number): boolean {
  if (i.kind === "credit_note" || i.state === "written_off") return false;
  if (filter === "paid") return i.state === "paid";
  const col = columnOf(i, now);
  if (filter === "late") return col === "late";
  if (filter === "unpaid") return col === "to_send" || col === "sent" || col === "late";
  return col !== null;
}

const owed = (i: BoardInvoice) =>
  Math.round((i.amount + i.lateCharge - i.payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;

/** First moment of the month in Colombo, not the server's own zone. */
export function monthStart(now: number): number {
  const c = new Date(now + COLOMBO_OFFSET_MS);
  return Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), 1) - COLOMBO_OFFSET_MS;
}

/**
 * Where an invoice stands. A draft has not gone, so it is never late. A dispute in good faith
 * is not late either (the agreement's own exception). A credit note or a written-off invoice is
 * on no column. Paid sits in Paid only for the month it was paid, so the column does not grow for ever.
 */
export function columnOf(i: BoardInvoice, now: number): Column | null {
  if (i.kind === "credit_note" || i.state === "written_off") return null;
  if (i.state === "draft") return "to_send";
  if (i.state === "paid") return (i.paidAt ?? 0) >= monthStart(now) ? "paid" : null;
  if (owed(i) <= 0) return null;
  if (i.dueAt && i.dueAt < now && !i.disputed) return "late";
  return "sent";
}

/** One invoice's status in the board's words, for a line elsewhere. Paid stays "Paid" in every month. */
export function statusWords(i: BoardInvoice, now: number): string {
  if (i.state === "written_off") return "Written off";
  if (i.state === "paid") return "Paid";
  if (i.state === "draft") return "To be sent";
  return columnOf(i, now) === "late" ? "Late payment" : "Sent";
}

export interface BoardSummary {
  toSend: number;
  sent: number;
  dueThisWeek: number;
  late: number;
  oldestLateDays: number;
  paidCount: number;
  paidSum: number;
  invoicedSum: number;
  lateSum: number;
  sentNotDueSum: number;
}

export function boardSummary(all: BoardInvoice[], now: number): BoardSummary {
  const from = monthStart(now);
  const s: BoardSummary = {
    toSend: 0, sent: 0, dueThisWeek: 0, late: 0, oldestLateDays: 0,
    paidCount: 0, paidSum: 0, invoicedSum: 0, lateSum: 0, sentNotDueSum: 0,
  };
  for (const i of all) {
    if (i.kind === "credit_note") continue;
    const col = columnOf(i, now);
    if (col === "to_send") s.toSend += 1;
    if (col === "sent") {
      s.sent += 1;
      s.sentNotDueSum += owed(i);
      if (i.dueAt && i.dueAt - now <= 7 * DAY) s.dueThisWeek += 1;
    }
    if (col === "late") {
      s.late += 1;
      s.lateSum += owed(i);
      s.oldestLateDays = Math.max(s.oldestLateDays, Math.floor((now - (i.dueAt ?? now)) / DAY));
    }
    if (i.state === "paid" && (i.paidAt ?? 0) >= from) s.paidCount += 1;
    for (const p of i.payments) if (p.paidAt >= from) s.paidSum += p.amount;
    if (i.sentAt && i.sentAt >= from && i.state !== "written_off") s.invoicedSum += i.amount;
  }
  return s;
}

/** The reminder a person copies and sends themselves: nothing here is ever sent. */
export function reminderText(p: { firstName: string; number: string; amount: string; due: string; pctPerMonth: number }): string {
  return (
    "Hello " + (p.firstName || "there") + ", invoice " + p.number + " for " + p.amount + " was due on " + p.due +
    ". A late charge of " + p.pctPerMonth + "% a month applies after the due date. Thank you"
  );
}

/** "17 Nov": a day as the v6 frames write it, in Colombo. */
export function dayShort(at: number | null): string {
  if (!at) return "no date";
  return new Date(at + COLOMBO_OFFSET_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
