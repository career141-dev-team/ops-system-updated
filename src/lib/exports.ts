/**
 * Getting the money out as a file (15, Phase 6 step 17).
 *
 * There is no accounting tool yet, so the one thing accounts really needs is
 * to be able to hand somebody a file. Two of them: what was invoiced, and
 * what came in.
 *
 * Deliberately plain CSV with one row per thing and no clever grouping - a
 * file that opens in anything, and that a person can check line by line
 * against a bank statement. The owner's rule is no spreadsheets *as the
 * system*; a file you take away is not the system.
 *
 * Nothing here touches a database.
 */

import { COLOMBO_OFFSET_MS } from "@/lib/calendar";

/** A date as a spreadsheet reads it, in Colombo's own day. */
export function csvDate(at: number | null): string {
  if (!at) return "";
  return new Date(at + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * One cell.
 *
 * A company called "Smith & Co, Pvt" and a reason with a comma in it both
 * break a naive join, and a cell that starts with = is read as a formula by
 * Excel - which is how a CSV becomes a security hole. Quoted, and anything
 * formula-shaped is prefixed.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function csvRows(header: string[], rows: (string | number | null)[][]): string {
  return [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n") + "\r\n";
}

export interface InvoiceForExport {
  number: string;
  kind: string;
  state: string;
  about: string | null;
  clientName: string;
  candidateName: string;
  amount: number;
  lateCharge: number;
  paid: number;
  balance: number;
  currency: string;
  sentAt: number | null;
  dueAt: number | null;
  paidAt: number | null;
  writtenOffAt: number | null;
  disputed: boolean;
}

export function invoicesCsv(rows: InvoiceForExport[]): string {
  return csvRows(
    [
      "invoice",
      "kind",
      "state",
      "client",
      "about",
      "candidate",
      "currency",
      "amount",
      "late charge",
      "received",
      "outstanding",
      "sent",
      "due",
      "paid",
      "written off",
      "disputed",
    ],
    rows.map((r) => [
      r.number,
      r.kind,
      r.state,
      r.clientName,
      r.about ?? "",
      r.candidateName,
      r.currency,
      r.amount,
      r.lateCharge,
      r.paid,
      r.balance,
      csvDate(r.sentAt),
      csvDate(r.dueAt),
      csvDate(r.paidAt),
      csvDate(r.writtenOffAt),
      r.disputed ? "yes" : "",
    ]),
  );
}

export interface PaymentForExport {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  paidAt: number;
  method: string;
  recordedBy: string;
  note: string | null;
}

export function paymentsCsv(rows: PaymentForExport[]): string {
  return csvRows(
    ["invoice", "client", "currency", "amount", "received", "how", "recorded by", "note"],
    rows.map((r) => [
      r.invoiceNumber,
      r.clientName,
      r.currency,
      r.amount,
      csvDate(r.paidAt),
      r.method,
      r.recordedBy,
      r.note ?? "",
    ]),
  );
}

/**
 * Where our invoice state and the TA System's may have drifted apart
 * (15, Phase 6 step 19).
 *
 * The only drift a laptop can see is our own: an invoice we sent whose write
 * to TA never got through. That is the one that matters anyway - TA's closing
 * checklist reads the invoice state, so a write stuck in the outbox means TA
 * thinks nothing was ever billed.
 */
export interface DriftRow {
  number: string;
  what: string;
}

export function invoiceDrift(
  invoices: { id: string; number: string; state: string; sentAt: number | null; placementId: string | null }[],
  outbox: { path: string; state: string; subjectType: string | null; subjectId: string | null }[],
): DriftRow[] {
  const drift: DriftRow[] = [];
  for (const invoice of invoices) {
    if (!invoice.sentAt) continue;
    const theirs = outbox.filter((o) => o.subjectType === "invoice" && o.subjectId === invoice.id);
    if (!theirs.length) {
      // No write at all: a surcharge has no placement, so there is nothing to
      // tell TA about - that is right, not drift.
      if (invoice.placementId) drift.push({ number: invoice.number, what: "sent, but the TA System was never told" });
      continue;
    }
    const stuck = theirs.find((o) => o.state !== "sent");
    if (stuck) {
      drift.push({
        number: invoice.number,
        what: "sent, but the write to the TA System is still " + stuck.state,
      });
    }
  }
  return drift;
}
