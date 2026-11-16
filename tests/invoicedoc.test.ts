/**
 * The values that fill the invoice template (16 Nov).
 *
 * The finance flow's rules: due is the joined day plus 30 (never the sent day),
 * a figure we do not know is left blank so the document is refused rather than
 * printed with an invented number, and a template with a hole nothing fills
 * names it.
 */
import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { fillDocx } from "@/lib/docxFill";
import { INVOICE_HOLES, invoiceHoles, problemWithInvoiceFill } from "@/lib/invoiceDoc";

const DAY = 86_400_000;
const JOINED = Date.parse("2026-11-02T09:00:00+05:30");
const base = {
  number: "C141-2026-0001",
  amount: 300_000,
  lateCharge: 0,
  currency: "LKR",
  dueAt: JOINED + 30 * DAY,
  reason: null,
  now: JOINED + 10 * DAY,
  client: { billingName: "SAMPLE (PVT) LTD", billingAddress: "1 Test Road, Colombo 03" },
  positionTitle: "Head of finance",
  placement: {
    candidateName: "SAMPLE CANDIDATE",
    joinedAt: JOINED,
    feeMonths: 1,
    feeBasis: "basic",
    basicSalary: 300_000,
    allowances: 150_000,
  },
};

test("every hole is filled from the record", () => {
  const h = invoiceHoles(base);
  assert.equal(h.invoiceNumber, "C141-2026-0001");
  assert.equal(h.billingAddress, "1 Test Road, Colombo 03");
  assert.equal(h.basicSalary, "300,000.00");
  assert.equal(h.allowances, "150,000.00");
  assert.equal(h.feeBasis, "basic salary");
  assert.equal(h.amount, "300,000.00");
  assert.equal(h.lateCharge, "0.00");
  assert.equal(h.total, "300,000.00");
  assert.equal(h.currency, "LKR");
  assert.equal(h.dueOn, invoiceHoles({ ...base, now: JOINED + 25 * DAY }).dueOn, "the sent day does not move the due date");
  for (const key of INVOICE_HOLES) assert(key in h, key + " is built");
});

test("the total adds a late charge", () => {
  assert.equal(invoiceHoles({ ...base, lateCharge: 3_000 }).total, "303,000.00");
});

test("an unknown split is left blank, so the document is refused", async () => {
  const h = invoiceHoles({ ...base, placement: { ...base.placement, basicSalary: null } });
  assert.equal(h.basicSalary, "");
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:t>Basic {{basicSalary}} to {{billingName}}</w:t>");
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  const filled = await fillDocx(bytes, h);
  assert.deepEqual(filled.missing, ["basicSalary"]);
  assert.match(problemWithInvoiceFill(filled.missing) ?? "", /basicSalary/);
  assert.equal(problemWithInvoiceFill([]), null);
});
