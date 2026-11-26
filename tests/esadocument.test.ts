import assert from "node:assert/strict";
import test from "node:test";

import { DRAFT_NOTE } from "@/lib/esa";
import { esaDocument, longOrdinalDate, markedParts } from "@/lib/esaDocument";

test("the agreement is the owner's draft filled with the client's own details", () => {
const at = Date.UTC(2026, 10, 9, 6);
assert.equal(longOrdinalDate(at), "9th November 2026");
assert.equal(longOrdinalDate(Date.UTC(2026, 10, 22, 6)), "22nd November 2026");
assert.equal(longOrdinalDate(Date.UTC(2026, 10, 12, 6)), "12th November 2026");

const d = esaDocument(
  { companyName: "VALTRIX PVT LTD", companyAddress: "72/B7 Kadawathe", clientBusiness: "Apparel", feeMonths: "1", feeBasis: "gross", guaranteeDays: "90", paymentDays: "30", replacementWorkingDays: "60", refundPct: "25", signatoryName: "Migara Bandara", signatoryTitle: "Operations Coordinator" },
  { company: "Valtrix", at, directorName: "M. Aazeem" },
);
const all = d.parties.join(" ") + d.sections.flatMap((s) => s.items).join(" ");
assert.match(all, /VALTRIX PVT LTD having its office at 72\/B7 Kadawathe/);
assert.match(all, /One Month Gross Salary of the placed candidate/);
assert.match(all, /90 calendar days \(3 months\)/);
assert.match(all, /sixty \(60\) working days/);
assert.match(all, /refund 25%/);
// the clause numbers the text points at must still hold: 5.1 is the fee, 5.4 the payment, 6.1 the guarantee
assert.match(d.sections[4].items[0], /Consultancy Fee for placement of Sri Lankan/);
assert.match(d.sections[4].items[3], /30 calendar days/);
assert.match(d.sections[5].items[0], /one-time replacement/);
assert.deepEqual(d.to, ["Migara Bandara · Operations Coordinator", "VALTRIX PVT LTD", "72/B7 Kadawathe"]);
});


const base = { companyName: "VALTRIX PVT LTD", clientBusiness: "Apparel", feeMonths: "1", expatFeeMonths: "3", feeBasis: "gross", guaranteeDays: "90", paymentDays: "30", replacementWorkingDays: "60", refundPct: "25" };
const at = Date.UTC(2026, 10, 9, 6);

test("clause 5.2 words the expat fee from its own months, not fee x 2", () => {
  const d = esaDocument({ ...base, signatoryName: "A", signatoryTitle: "B", companyAddress: "C" }, { company: "Valtrix", at, directorName: "D" });
  assert.match(d.sections[4].items[1], /non-Sri Lankan is: Three Months Gross Salary of the placed candidate/);
  assert.doesNotMatch(d.sections[4].items[1], /x 2/);
  const none = esaDocument({ ...base, expatFeeMonths: "" }, { company: "Valtrix", at, directorName: "D" });
  assert.match(none.sections[4].items[1], /\[fee for a non-Sri Lankan\]/);
});

test("a draft marks the signatory, the title and the address as to be confirmed, with the note above the parties", () => {
  const draft = esaDocument(base, { company: "Valtrix", at, directorName: "D" }, "draft");
  assert.equal(draft.draftNote, DRAFT_NOTE);
  assert.deepEqual(markedParts(draft.to[0]), [{ text: "To be confirmed", mark: true }, { text: " · ", mark: false }, { text: "To be confirmed", mark: true }]);
  assert.ok(markedParts(draft.parties[2]).some((p) => p.mark && p.text === "To be confirmed"));
  assert.ok(markedParts(draft.signing.client).every((p) => p.mark));
  assert.doesNotMatch(draft.parties.join(" "), /\[registered address\]/);
  // the same fields as a final keep the old brackets and no note
  const final = esaDocument(base, { company: "Valtrix", at, directorName: "D" });
  assert.equal(final.draftNote, undefined);
  assert.match(final.parties[2], /\[registered address\]/);
  assert.deepEqual(markedParts(final.to[0]), [{ text: "VALTRIX PVT LTD", mark: false }]);
});
