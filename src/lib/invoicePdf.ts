/**
 * The invoice, drawn (owner, 17 Nov): the owner's own design, "Invoice Final design 1 (SL)", laid out in
 * code with pdf-lib, so a real PDF can be made on any machine, with no Word template and no LibreOffice.
 *
 * The letterhead (company, phones, address) is the same on every invoice and lives here. The bank details
 * are the owner's and live in Settings, not in the code; `problemWithBank` refuses a bill that has none.
 *
 * Pure apart from reading the logo bundled in `invoiceLogo.ts`: no database, nothing sent.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { drawable } from "./docxPdf";
import { LOGO_PNG_BASE64 } from "./invoiceLogo";

export interface InvoiceBank {
  bank: string;
  accountName: string;
  accountNo: string;
  branch: string;
  swift: string;
}

export interface InvoiceRow {
  position: string;
  name: string;
  appointed: string;
  fee: string;
  due: string;
  amount: string;
}

export interface InvoicePdfInput {
  /** "INVOICE" or "CREDIT NOTE". */
  title: string;
  /** What the money is for: "Job Placement". */
  service: string;
  billedTo: { name: string; address: string };
  number: string;
  /** The date, in words. */
  dateWords: string;
  rows: InvoiceRow[];
  totalLabel: string;
  totalText: string;
  bank: InvoiceBank;
}

/** The letterhead on every invoice (from the owner's design). */
export const LETTERHEAD = {
  company: "CAREER CONSULTANTS (PVT) LTD  |  PV73499",
  phones: [
    ["Sri Lanka", "+94 75 359 5495", "+94 75 577 8899"],
    ["Dubai", "+971 56 530 2484", ""],
    ["Singapore", "+65 89 022 082", ""],
  ] as const,
  web: "www.career141.com",
  address: ["35/1, Stubbs Place, Dickman's Road,", "Col - 05 Sri Lanka"],
  email: "hello@career141.com",
};

/** Why the invoice cannot be drawn: a bill with no way to pay is never made. */
export function problemWithBank(bank: InvoiceBank): string | null {
  const blank = [
    ["bank", bank.bank],
    ["account name", bank.accountName],
    ["account number", bank.accountNo],
    ["branch", bank.branch],
    ["SWIFT code", bank.swift],
  ]
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  if (!blank.length) return null;
  return (
    "The bank details are not set yet (" +
    blank.join(", ") +
    "). Add them in Settings, under Bank details on invoices: a bill with no way to pay is not made."
  );
}

const PAGE = { w: 595, h: 842, margin: 48 };
const GREEN = rgb(0.247, 0.478, 0.255);
const INK = rgb(0.1, 0.1, 0.1);
const PAPER = rgb(0.965, 0.965, 0.965);

/** Words wrapped to a width, one array of lines. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of drawable(paragraph).split(/ +/).filter(Boolean)) {
      const next = line ? line + " " + word : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function drawInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(drawable(input.title + " " + input.number));
  const page = pdf.addPage([PAGE.w, PAGE.h]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));

  const left = PAGE.margin;
  const right = PAGE.w - PAGE.margin;
  const inner = right - left;
  const y = (fromTop: number) => PAGE.h - fromTop; // easier to think from the top of the page

  const text = (s: string, x: number, top: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "center" | "right"; width?: number } = {}) => {
    const size = o.size ?? 10;
    const font = o.font ?? regular;
    const t = drawable(s);
    const w = font.widthOfTextAtSize(t, size);
    const x0 = o.align === "right" ? x - w : o.align === "center" ? x + ((o.width ?? 0) - w) / 2 : x;
    page.drawText(t, { x: x0, y: y(top), size, font, color: o.color ?? INK });
  };

  page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: PAPER });

  // Logo and title
  const logoH = 82;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, { x: left, y: y(36 + logoH), width: logoW, height: logoH });
  const title = drawable(input.title);
  text(title, right, 92, { size: 30, font: bold, align: "right" });
  const titleW = bold.widthOfTextAtSize(title, 30);
  page.drawRectangle({ x: right - titleW, y: y(104), width: titleW, height: 3, color: GREEN });

  // Placement to / service offered
  const label = (s: string, x: number, top: number, w: number) => {
    page.drawRectangle({ x, y: y(top + 20), width: w, height: 20, color: GREEN });
    text(s, x, top + 14, { size: 10.5, font: bold, color: rgb(1, 1, 1), align: "center", width: w });
  };
  label("PLACEMENT TO :", left, 150, 110);
  label("SERVICE OFFERED :", right - 126, 150, 126);
  let top = 188;
  text(input.billedTo.name, left, top, { size: 10.5, font: bold });
  for (const line of wrap(input.billedTo.address, regular, 10.5, 270)) {
    top += 14;
    text(line, left, top, { size: 10.5 });
  }
  text(input.service, right - 126, 188, { size: 10.5 });

  // Invoice number and date
  const boxTop = Math.max(top + 24, 252);
  page.drawRectangle({ x: left, y: y(boxTop + 28), width: inner, height: 28, borderColor: GREEN, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: left + inner / 2, y: y(boxTop + 22), width: 1.5, height: 16, color: GREEN });
  text(`${input.title === "CREDIT NOTE" ? "CREDIT NOTE NO" : "INVOICE NO"} : ${input.number}`, left + 18, boxTop + 18, { size: 10.5, font: bold, color: GREEN });
  text(`INVOICE DATE : ${input.dateWords}`, right - 18, boxTop + 18, { size: 10.5, font: bold, color: GREEN, align: "right" });

  // The table
  const heads = ["Position", "Name Of The Recruited", "Date Of Appointment", "Consultancy Fee", "Due Date", "Amount"];
  const shares = [0.18, 0.2, 0.17, 0.16, 0.14, 0.15];
  const widths = shares.map((s) => s * inner);
  const tableTop = boxTop + 50;
  page.drawRectangle({ x: left, y: y(tableTop + 36), width: inner, height: 36, color: GREEN });
  let x = left;
  heads.forEach((h, i) => {
    const lines = wrap(h, bold, 8.5, widths[i] - 10);
    lines.forEach((line, k) => {
      text(line, x, tableTop + (lines.length === 1 ? 22 : 16 + k * 11), { size: 8.5, font: bold, color: rgb(1, 1, 1), align: "center", width: widths[i] });
    });
    x += widths[i];
  });

  let rowTop = tableTop + 36;
  input.rows.forEach((row, n) => {
    const cells = [row.position, row.name, row.appointed, row.fee, row.due, row.amount];
    const wrapped = cells.map((c, i) => wrap(c, regular, 8.5, widths[i] - 12));
    const height = Math.max(32, Math.max(...wrapped.map((w) => w.length)) * 11 + 14);
    page.drawRectangle({ x: left, y: y(rowTop + height), width: inner, height, color: n % 2 === 0 ? rgb(1, 1, 1) : PAPER });
    let cx = left;
    wrapped.forEach((lines, i) => {
      lines.forEach((line, k) => {
        text(line, cx, rowTop + 15 + k * 11, { size: 8.5, align: "center", width: widths[i] });
      });
      cx += widths[i];
    });
    rowTop += height;
  });
  // Bank details (left) and the total (right)
  const below = rowTop + 46;
  const bankLines: [string, string][] = [
    ["Bank", input.bank.bank],
    ["Account Name", input.bank.accountName],
    ["Account No", input.bank.accountNo],
    ["Branch", input.bank.branch],
    ["Swift Code", input.bank.swift],
  ];
  const bankH = bankLines.length * 18 + 18;
  page.drawRectangle({ x: left, y: y(below + bankH), width: 282, height: bankH, color: rgb(1, 1, 1), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 0.6 });
  bankLines.forEach(([k, v], i) => {
    const t = below + 20 + i * 18;
    text(k, left + 14, t, { size: 9, font: bold });
    text(":", left + 88, t, { size: 9 });
    text(wrap(v, regular, 9, 172)[0] ?? "", left + 100, t, { size: 9 });
  });
  const barW = 200;
  page.drawRectangle({ x: right - barW, y: y(below + 34), width: barW, height: 34, color: GREEN });
  text(input.totalLabel, right - barW + 14, below + 21, { size: 9.5, color: rgb(1, 1, 1) });
  text(input.totalText, right - 14, below + 22, { size: 13, font: bold, color: rgb(1, 1, 1), align: "right" });

  // The letterhead, at the foot
  const foot = PAGE.h - 150;
  text(LETTERHEAD.company, left, foot, { size: 11, font: bold });
  page.drawRectangle({ x: left, y: y(foot + 8), width: 270, height: 2.5, color: GREEN });
  LETTERHEAD.phones.forEach(([place, one, two], i) => {
    const t = foot + 28 + i * 16;
    text(place, left + 4, t, { size: 9.5 });
    text("|  " + one + (two ? "   |  " + two : ""), left + 64, t, { size: 9.5 });
  });
  text(LETTERHEAD.web, right - 190, foot + 28, { size: 9.5 });
  LETTERHEAD.address.forEach((line, i) => text(line, right - 190, foot + 44 + i * 13, { size: 9.5 }));
  text(LETTERHEAD.email, right - 190, foot + 76, { size: 9.5 });

  return pdf.save();
}
