/**
 * The agreement template, filled, reads like the owner's own ESA (18 Nov).
 *
 * The owner's complaint: the agreement the system made did not look like the ESA
 * they send. The fill must change the words in the holes and nothing else - not the
 * letterhead, header, footer, pictures or numbering - and the fee and guarantee lines
 * must read as the owner writes them ("One Month Gross Salary", "90 calendar days
 * (3 months)"), not "1 month(s) gross salary".
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import JSZip from "jszip";

import { fillDocx, holesInDocx } from "@/lib/docxFill";
import { ESA_FIELDS, WORDED_HOLES, holeValues } from "@/lib/esa";

const TEMPLATE = readFileSync(path.join(process.cwd(), "docs/templates/ESA-TEMPLATE.docx"));

const SAMPLE = {
  companyName: "SAMPLE CLIENT PVT LTD",
  companyAddress: "1 Sample Road, Colombo 03",
  clientBusiness: "the business of sample services",
  signatoryName: "Ms. Sample Person",
  signatoryTitle: "Operations Coordinator",
  feeMonths: "1",
  feeBasis: "gross",
  guaranteeDays: "90",
  paymentDays: "30",
  replacementWorkingDays: "60",
  refundPct: "25",
};

const textOf = (xml: string) =>
  [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((p) => p[0].replace(/<[^>]+>/g, "")).join("\n");

test("every hole in the template is a field, a worded field or the date", async () => {
  const known = new Set([...ESA_FIELDS.map((f) => f.key), ...Object.keys(WORDED_HOLES), "effectiveDate"]);
  for (const hole of await holesInDocx(TEMPLATE)) assert.ok(known.has(hole), hole + " is filled by nothing");
});

test("the filled agreement changes the words and nothing else in the file", async () => {
  const answer = await fillDocx(TEMPLATE, { ...holeValues(SAMPLE), effectiveDate: "18th November 2026" });
  assert.deepEqual(answer.missing, []);
  const before = await JSZip.loadAsync(TEMPLATE);
  const after = await JSZip.loadAsync(answer.bytes!);
  assert.deepEqual(Object.keys(after.files).sort(), Object.keys(before.files).sort());
  for (const name of Object.keys(before.files)) {
    if (name === "word/document.xml" || before.files[name].dir) continue;
    const [a, b] = await Promise.all([before.file(name)!.async("nodebuffer"), after.file(name)!.async("nodebuffer")]);
    assert.ok(a.equals(b), name + " changed");
  }
  const xmlBefore = await before.file("word/document.xml")!.async("string");
  const xmlAfter = await after.file("word/document.xml")!.async("string");
  const count = (xml: string, tag: RegExp) => (xml.match(tag) ?? []).length;
  for (const tag of [/<w:p[ >]/g, /<w:drawing>/g, /<w:numPr>/g, /<w:sectPr/g]) {
    assert.equal(count(xmlAfter, tag), count(xmlBefore, tag), String(tag) + " count moved");
  }

  const text = textOf(xmlAfter);
  assert.doesNotMatch(text, /\{\{/);
  assert.match(text, /Sri Lankan is: One Month Gross Salary of the placed candidate\./);
  assert.match(text, /non-Sri Lankan is: One Month Gross Salary x 2 of the placed candidate\./);
  assert.match(text, /within 90 calendar days \(3 months\) from the first working day/);
  assert.match(text, /within a period of sixty \(60\) working days from the date of receiving/);
  assert.match(text, /not fulfilled the replacement within 60 working days/);
  assert.match(text, /On behalf of SAMPLE CLIENT PVT LTD/);
});

test("the fee and guarantee are worded the way the agreement writes them", () => {
  assert.equal(holeValues({ feeMonths: "2", feeBasis: "basic", guaranteeDays: "60" }).feeText, "Two Months Basic Salary");
  assert.equal(holeValues({ feeMonths: "2", feeBasis: "basic", guaranteeDays: "60" }).guaranteeText, "60 calendar days (2 months)");
  assert.equal(holeValues({ feeMonths: "1", guaranteeDays: "30" }).guaranteeText, "30 calendar days (1 month)");
  assert.equal(holeValues({ guaranteeDays: "45" }).guaranteeText, "45 calendar days");
  assert.equal(holeValues({ replacementWorkingDays: "60" }).replacementText, "sixty (60)");
  assert.equal(holeValues({ replacementWorkingDays: "45" }).replacementText, "forty-five (45)");
  assert.equal(holeValues({ replacementWorkingDays: "14" }).replacementText, "fourteen (14)");
  assert.equal(holeValues({ replacementWorkingDays: "120" }).replacementText, "");
  // A number we cannot word leaves the hole blank, so the fill refuses instead of guessing.
  assert.equal(holeValues({ feeMonths: "1.5" }).feeText, "");
  assert.equal(holeValues({ feeMonths: "" }).feeText, "");
  assert.equal(holeValues({ guaranteeDays: "abc" }).guaranteeText, "");
});
