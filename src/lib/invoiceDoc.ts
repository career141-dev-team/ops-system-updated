/**
 * What goes into the holes of the invoice template (16 Nov).
 *
 * Pure: it only turns an invoice, its placement and the client's billing
 * record into text. The owner's FigJam finance flow says the due date is the
 * joined day plus 30 - never the sent day - and that numbers on the document
 * are the ones on the record, so the amounts are read from the invoice, not
 * recomputed here. A value we do not know is left blank, and fillDocx then
 * refuses the document and names the hole: no invented figures on a bill.
 */

import { colomboDateInWords } from "./calendar";

export const INVOICE_HOLES = [
  "invoiceNumber",
  "invoiceDate",
  "billingName",
  "billingAddress",
  "candidateName",
  "positionTitle",
  "joinedOn",
  "basicSalary",
  "allowances",
  "feeMonths",
  "feeBasis",
  "amount",
  "lateCharge",
  "dueOn",
  "total",
  "currency",
  "againstInvoiceNumber",
  "reason",
] as const;

export interface InvoiceDocInput {
  number: string;
  amount: number;
  lateCharge: number;
  currency: string;
  dueAt: number | null;
  reason: string | null;
  /** The invoice a credit note is against. */
  againstNumber?: string | null;
  now: number;
  client: { billingName: string; billingAddress?: string };
  placement?: {
    candidateName: string;
    joinedAt: number | null;
    feeMonths: number;
    feeBasis: string;
    basicSalary: number | null;
    allowances: number;
  } | null;
  /** A surcharge has no placement; what it is about is written on it. */
  about?: string | null;
  positionTitle?: string;
}

/** 450000 becomes "450,000.00". The currency has its own hole. */
export function plain(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function invoiceHoles(i: InvoiceDocInput): Record<string, string> {
  const p = i.placement;
  const knownSplit = p?.basicSalary != null && p.basicSalary > 0;
  return {
    invoiceNumber: i.number,
    invoiceDate: colomboDateInWords(i.now),
    billingName: i.client.billingName,
    billingAddress: i.client.billingAddress ?? "",
    candidateName: p?.candidateName ?? i.about ?? "",
    positionTitle: i.positionTitle ?? "",
    joinedOn: p?.joinedAt ? colomboDateInWords(p.joinedAt) : "",
    basicSalary: knownSplit ? plain(p!.basicSalary!) : "",
    allowances: knownSplit ? plain(p!.allowances) : "",
    feeMonths: p ? String(p.feeMonths) : "",
    feeBasis: p ? (p.feeBasis === "basic" ? "basic salary" : "gross salary") : "",
    amount: plain(i.amount),
    // "0.00" is a real answer for a late charge, so it is never left blank.
    lateCharge: plain(i.lateCharge),
    // Joined day + 30, carried on the invoice as dueAt; the sent day plays no part.
    dueOn: i.dueAt ? colomboDateInWords(i.dueAt) : "",
    total: plain(Math.round((i.amount + i.lateCharge) * 100) / 100),
    currency: i.currency,
    againstInvoiceNumber: i.againstNumber ?? "",
    reason: i.reason ?? "",
  };
}

export function problemWithInvoiceFill(missing: string[]): string | null {
  if (!missing.length) return null;
  return (
    "The invoice template has holes nothing fills: " +
    missing.join(", ") +
    ". Fix the record they come from (the client's billing details, or the placement's basic salary and allowances), or take them out of the template."
  );
}
