/**
 * The invoice drawn to the owner's design (17 Nov): one sheet per job, bank details from Settings,
 * and no bill with nothing to pay into.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";

import { invoiceSheet, moneyText } from "@/lib/invoiceDoc";
import { type InvoiceBank, drawInvoicePdf, problemWithBank } from "@/lib/invoicePdf";

const bank: InvoiceBank = { bank: "Commercial Bank of Ceylon Ltd", accountName: "CAREER CONSULTANTS (PVT) LTD", accountNo: "0000000000", branch: "Union Place", swift: "CCEYLKLX" };
const NOW = Date.parse("2026-12-07T10:00:00+05:30");
const input = {
  number: "C141-2026-0001",
  amount: 377000,
  lateCharge: 0,
  currency: "LKR",
  dueAt: Date.parse("2026-12-22T10:00:00+05:30"),
  reason: null,
  now: NOW,
  client: { billingName: "Gallagher Sri Lanka", billingAddress: "Orion City IT Park, No.752/5,\nColombo 9" },
  placement: { candidateName: "Sadisha Randika Lokuyaddehige", joinedAt: Date.parse("2026-11-22T10:00:00+05:30"), feeMonths: 1, feeBasis: "gross", basicSalary: null, allowances: 0, package: "" },
  positionTitle: "Senior QA Engineer",
};

test("the amount reads as on the owner's invoice: whole numbers without pence, and the currency after", () => {
  assert.equal(moneyText(377000, "LKR"), "377,000 LKR");
  assert.equal(moneyText(1250.5, "LKR"), "1,250.50 LKR");
});

test("the sheet has one row for the placement, a row for a late charge, and the total", () => {
  const plain = invoiceSheet(input, bank);
  assert.equal(plain.title, "INVOICE");
  assert.equal(plain.service, "Job Placement");
  assert.equal(plain.rows.length, 1);
  assert.deepEqual(plain.rows[0], {
    position: "Senior QA Engineer",
    name: "Sadisha Randika Lokuyaddehige",
    appointed: "22 November 2026",
    fee: "377,000 LKR",
    due: "22 December 2026",
    amount: "377,000 LKR",
  });
  assert.equal(plain.totalText, "377,000 LKR");

  const late = invoiceSheet({ ...input, lateCharge: 18850 }, bank);
  assert.equal(late.rows.length, 2);
  assert.equal(late.rows[1].position, "Late charge");
  assert.equal(late.totalText, "395,850 LKR");
});

test("a credit note and a surcharge use the same sheet with their own title", () => {
  const credit = invoiceSheet({ ...input, kind: "credit_note", placement: null, againstNumber: "C141-2026-0001", reason: "Replacement not found", positionTitle: "" }, bank);
  assert.equal(credit.title, "CREDIT NOTE");
  assert.equal(credit.totalLabel, "TOTAL CREDIT");
  assert.match(credit.service, /C141-2026-0001/);
  assert.equal(credit.rows[0].position, "Replacement not found");
  assert.equal(invoiceSheet({ ...input, kind: "surcharge", placement: null, about: "Unreported hire", positionTitle: "" }, bank).service, "Unreported hire surcharge");
});

test("a bill with no way to pay is refused, and says which details are missing", () => {
  assert.equal(problemWithBank(bank), null);
  const none = problemWithBank({ bank: "", accountName: " ", accountNo: "", branch: "x", swift: "y" }) ?? "";
  assert.match(none, /bank, account name, account number/);
  assert.match(none, /Settings/);
});

test("it draws one real A4 page, even with long names and a long address", async () => {
  const bytes = await drawInvoicePdf({
    ...invoiceSheet({ ...input, client: { billingName: "A Very Long Company Name Of Sri Lanka Private Limited", billingAddress: "Floor 12, Some Tower With A Long Name,\nA Road With An Even Longer Name Than That, Colombo 03, Sri Lanka, 00300" }, placement: { ...input.placement, candidateName: "Someone With A Truly Extraordinarily Long Full Name Indeed" } }, bank),
  });
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.deepEqual([Math.round(width), Math.round(height)], [595, 842]);
});
