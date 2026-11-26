import assert from "node:assert/strict";
import test from "node:test";

import { chaseRows, clauses, coverNote, monthsWords, termRows } from "@/lib/agreementView";

const DAY = 86_400_000;
const SENT = Date.UTC(2026, 10, 11, 5, 0); // Wed 11 Nov

test("the terms and clauses come from the agreement's own fields", () => {
  assert.equal(monthsWords("1"), "one month");
  assert.equal(monthsWords("2"), "two months");
  assert.equal(monthsWords("1.5"), "1.5 months");
  assert.equal(monthsWords(undefined), "one month");
  assert.deepEqual(termRows({ feeMonths: "1", guaranteeDays: "60", paymentDays: "45" }), [
    { label: "Fee", value: "One month" },
    { label: "Guarantee", value: "60 days" },
    { label: "Payment", value: "45 days" },
    { label: "Client", value: "Not chosen" },
    { label: "Expat fee", value: "Two months" },
  ]);
  const t = termRows({ clientType: "international", expatFeeMonths: "2" });
  assert.deepEqual([t[3].value, t[4].value], ["International", "Two months"]);
  assert.equal(termRows({})[1].value, "90 days");
  assert.equal(termRows({ feeMonths: "2" })[4].value, "Four months", "no expat fee recorded reads twice the fee");
  const c = clauses({ feeMonths: "2", feeBasis: "basic", guaranteeDays: "60", paymentDays: "45" });
  assert.match(c[0].text, /two months of the placed person's basic salary/);
  assert.match(c[1].text, /within 60 days/);
  assert.match(c[2].text, /within 45 days/);
});

test("the cover note names the call only when there was one", () => {
  const fields = { feeMonths: "1", guaranteeDays: "90", paymentDays: "30" };
  const withCall = coverNote({ contact: "Tharanga Silva", owner: "Rushda", fields, callDate: "12 November" });
  assert.match(withCall, /^Hi Tharanga,/);
  assert.match(withCall, /Thank you for the call on 12 November\. As discussed, our agreement is attached\./);
  assert.match(withCall, /a fee of one month per placement, a 90 day guarantee, and payment within 30 days/);
  const without = coverNote({ contact: "", owner: "Rushda", fields, callDate: null });
  assert.match(without, /^Hi there,/);
  assert.match(without, /Our agreement is attached/);
});

test("the chase history counts days from the day it was sent", () => {
  assert.deepEqual(chaseRows({ sentAt: null, chaseStep: 0 }, SENT), []);
  // Sent Wed 11 Nov, two chases gone: chase 3 falls on day 7 (2+2+3), Wed 18 Nov.
  const rows = chaseRows({ sentAt: SENT, chaseStep: 2 }, SENT + 7 * DAY);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].title, "Chase 1 sent");
  assert.match(rows[0].sub, /day 2$/);
  assert.match(rows[1].sub, /day 4, still not signed$/);
  assert.equal(rows[2].kind, "due");
  assert.equal(rows[2].title, "Chase 3 is due today");
  assert.match(rows[2].sub, /^Day 7\. Chase 4 follows /);
  // Not due yet, then late, then the plan has run out.
  assert.equal(chaseRows({ sentAt: SENT, chaseStep: 0 }, SENT)[0].title, "Chase 1 is due Fri 13 Nov");
  assert.equal(chaseRows({ sentAt: SENT, chaseStep: 0 }, SENT + 5 * DAY)[0].kind, "over");
  const out = chaseRows({ sentAt: SENT, chaseStep: 6 }, SENT + 30 * DAY);
  assert.equal(out.at(-1)?.title, "The chase has run out");
});
