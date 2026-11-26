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
import type { InvoiceBank, InvoicePdfInput } from "./invoicePdf";
import { feeMonthsFor } from "./money";

export const INVOICE_HOLES = [
  "invoiceNumber",
  "invoiceDate",
  "billingName",
  "billingAddress",
  "billingEmail",
  "candidateName",
  "positionTitle",
  "joinedOn",
  "package",
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
  client: { billingName: string; billingAddress?: string; billingEmail?: string };
  placement?: {
    candidateName: string;
    joinedAt: number | null;
    feeMonths: number;
    expatFeeMonths?: number;
    nationality?: string;
    feeBasis: string;
    basicSalary: number | null;
    allowances: number;
    /** TA's free-text package, as the client agreed it. */
    package?: string;
  } | null;
  /** A surcharge has no placement; what it is about is written on it. */
  about?: string | null;
  /** fee, surcharge or credit_note: the title and the service line follow it. */
  kind?: string;
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
    billingEmail: i.client.billingEmail ?? "",
    candidateName: p?.candidateName ?? i.about ?? "",
    positionTitle: i.positionTitle ?? "",
    joinedOn: p?.joinedAt ? colomboDateInWords(p.joinedAt) : "",
    package: p?.package ?? "",
    basicSalary: knownSplit ? plain(p!.basicSalary!) : "",
    allowances: knownSplit ? plain(p!.allowances) : "",
    feeMonths: p ? String(feeMonthsFor(p)) : "",
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

export interface InvoiceVersion {
  version: number;
  file: { id: string; name: string; mime: string; uploadedAt: number };
}

/**
 * The invoice document's versions, newest first (17 Nov): each "make the invoice" is the next version,
 * read from the file names ("Invoice C141-2026-0001 - v2.pdf"). The PDF stands for a version that has
 * both; a file from before versions existed counts as version 1.
 */
export function invoiceVersions(files: { id: string; name: string; mime: string; uploadedAt: number; kind: string }[]): InvoiceVersion[] {
  const best = new Map<number, InvoiceVersion>();
  for (const f of files) {
    if (f.kind !== "invoice") continue;
    const m = /- v([0-9]+)\.(pdf|docx)$/i.exec(f.name);
    const version = m ? Number(m[1]) : 1;
    const isPdf = f.name.toLowerCase().endsWith(".pdf");
    const have = best.get(version);
    if (!have || (isPdf && !have.file.name.toLowerCase().endsWith(".pdf"))) best.set(version, { version, file: f });
  }
  return [...best.values()].sort((a, b) => b.version - a.version);
}

export function nextInvoiceVersion(files: Parameters<typeof invoiceVersions>[0]): number {
  return Math.max(0, ...invoiceVersions(files).map((v) => v.version)) + 1;
}

/** What an invoice that is a bill has to print, whatever else the owner's layout has. */
const INVOICE_REQUIRED = ["invoiceNumber", "billingName", "amount", "dueOn"];

/**
 * What is wrong between a template's holes and what we fill (owner, 17 Nov): `unknown` is a hole nothing
 * fills, so every send would refuse; `unused` is something a bill must say that the template never prints.
 */
export function checkInvoiceTemplate(holes: string[]): { unknown: string[]; unused: string[] } {
  const known = new Set<string>(INVOICE_HOLES);
  return {
    unknown: holes.filter((h) => !known.has(h)),
    unused: INVOICE_REQUIRED.filter((h) => !holes.includes(h)),
  };
}

/** 377000 becomes "377,000 LKR", as on the owner's invoice; 1250.5 keeps its pence. */
export function moneyText(amount: number, currency: string): string {
  return (Number.isInteger(amount) ? amount.toLocaleString("en-US") : plain(amount)) + " " + currency;
}

/**
 * What the drawn invoice says (owner, 17 Nov), from the same input as the template holes: one row for the
 * placement (position, who, the day they joined, the fee, the due day, the amount), a row for a late charge
 * when there is one, and the total. A surcharge and a credit note use the same sheet with their own title.
 */
export function invoiceSheet(i: InvoiceDocInput, bank: InvoiceBank): InvoicePdfInput {
  const h = invoiceHoles(i);
  const credit = i.kind === "credit_note";
  const rows = [
    {
      position: h.positionTitle || i.about || i.reason || "",
      name: h.candidateName === i.about ? "" : h.candidateName,
      appointed: h.joinedOn,
      fee: moneyText(i.amount, i.currency),
      due: h.dueOn,
      amount: moneyText(i.amount, i.currency),
    },
  ];
  if (i.lateCharge > 0) {
    rows.push({ position: "Late charge", name: "", appointed: "", fee: "", due: "", amount: moneyText(i.lateCharge, i.currency) });
  }
  return {
    title: credit ? "CREDIT NOTE" : "INVOICE",
    service: credit ? "Credit against invoice " + (i.againstNumber ?? "") : i.kind === "surcharge" ? "Unreported hire surcharge" : "Job Placement",
    billedTo: { name: i.client.billingName, address: i.client.billingAddress ?? "" },
    number: i.number,
    dateWords: h.invoiceDate,
    rows,
    totalLabel: credit ? "TOTAL CREDIT" : "TOTAL DUE",
    totalText: moneyText(Math.round((i.amount + i.lateCharge) * 100) / 100, i.currency),
    bank,
  };
}
