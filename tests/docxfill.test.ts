/**
 * Filling the agreement template (15, Phase 2 step 10).
 *
 * The incident these rules exist for is the owner's: a draft went to a client
 * with placeholders still in it. So the rule here is that a hole nothing fills
 * stops the document being made at all.
 */
import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { fillDocx, forXml, holesIn, holesInDocx, problemWithFill } from "@/lib/docxFill";

/** The smallest thing shaped like a .docx: one part with text in it. */
async function docx(body: string, header?: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("word/document.xml", `<w:document><w:body><w:p><w:r><w:t>${body}</w:t></w:r></w:p></w:body></w:document>`);
  if (header) zip.file("word/header1.xml", `<w:hdr><w:p><w:r><w:t>${header}</w:t></w:r></w:p></w:hdr>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function textOf(file: Buffer, part = "word/document.xml"): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  return zip.file(part)!.async("string");
}

test("the holes are found once each, in the order they appear", () => {
  const xml = "<w:t>{{companyName}} and {{ signatoryName }} and {{companyName}}</w:t>";
  assert.deepEqual(holesIn(xml), ["companyName", "signatoryName"]);
  assert.deepEqual(holesIn("<w:t>nothing to fill</w:t>"), []);
});

test("every hole is filled, in the body and in the header", async () => {
  const file = await docx("Between us and {{companyName}} of {{companyAddress}}.", "{{companyName}} - agreement");
  const answer = await fillDocx(file, {
    companyName: "SAMPLE CLIENT (Pvt) Ltd",
    companyAddress: "1 Sample Road, Colombo",
  });
  assert.deepEqual(answer.missing, []);
  assert.deepEqual(answer.filled.sort(), ["companyAddress", "companyName"]);
  assert(answer.bytes, "a document came back");

  const body = await textOf(answer.bytes!);
  assert.match(body, /SAMPLE CLIENT \(Pvt\) Ltd/);
  assert.doesNotMatch(body, /\{\{/, "no hole is left");
  const header = await textOf(answer.bytes!, "word/header1.xml");
  assert.match(header, /SAMPLE CLIENT/, "headers are filled too, or the client's name is missing from every page");
});

test("a hole nothing fills stops the document being made", async () => {
  const file = await docx("{{companyName}} of {{companyAddress}}, tax {{taxNo}}.");
  const answer = await fillDocx(file, { companyName: "SAMPLE CLIENT", companyAddress: "   " });
  assert.equal(answer.bytes, null, "nothing is made");
  assert.deepEqual(answer.missing, ["companyAddress", "taxNo"], "a blank value is no value");

  const said = problemWithFill(answer.missing, (key) => (key === "taxNo" ? "Tax number" : "Registered address"));
  assert.match(said ?? "", /holes nothing fills/i);
  assert.match(said ?? "", /registered address, tax number/);
  assert.match(said ?? "", /placeholders in it once/, "it says why the rule is there");
  assert.equal(problemWithFill([], (k) => k), null);
});

test("a client whose name has an ampersand does not break the document", async () => {
  // "Smith & Co" written straight into XML makes an unreadable file, and Word
  // refuses to open it at all.
  assert.equal(forXml("Smith & Co <Pvt>"), "Smith &amp; Co &lt;Pvt&gt;");
  const file = await docx("Between us and {{companyName}}.");
  const answer = await fillDocx(file, { companyName: "Smith & Co" });
  const body = await textOf(answer.bytes!);
  assert.match(body, /Smith &amp; Co/);
  // It is still a readable zip with a parseable part, which is the real check.
  assert.deepEqual(await holesInDocx(answer.bytes!), []);
});

test("the holes of a real template can be read without changing it", async () => {
  const file = await docx("{{companyName}} {{registrationNo}}", "{{effectiveDate}}");
  assert.deepEqual(await holesInDocx(file), ["companyName", "registrationNo", "effectiveDate"]);
});

/** A document whose one paragraph is the given runs and other XML, as Word writes it. */
async function docxOfParagraph(inner: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("word/document.xml", `<w:document><w:body><w:p>${inner}</w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

const run = (text: string, bold = false) =>
  `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

test("a hole split over two runs is found and filled, keeping the first run's look", async () => {
  const file = await docxOfParagraph(run("Between us and ") + run("{{company", true) + run("Name}} of Colombo."));
  assert.deepEqual(await holesInDocx(file), ["companyName"]);
  const answer = await fillDocx(file, { companyName: "Smith & Co" });
  assert.deepEqual(answer.missing, []);
  const body = await textOf(answer.bytes!);
  assert.match(body, /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">Smith &amp; Co<\/w:t>/);
  assert.match(body, /<w:t xml:space="preserve"> of Colombo\.<\/w:t>/, "the text after the hole stays");
  assert.doesNotMatch(body, /\{\{|\}\}/);
});

test("a hole split over three runs, with spell-check and bookmark marks between, is filled", async () => {
  const file = await docxOfParagraph(
    run("Signed: {{sig") +
      '<w:proofErr w:type="spellStart"/>' +
      run("natory") +
      '<w:bookmarkStart w:id="1" w:name="x"/>' +
      run("Name}} (director)"),
  );
  assert.deepEqual(await holesInDocx(file), ["signatoryName"]);
  const answer = await fillDocx(file, { signatoryName: "A. Perera" });
  assert.deepEqual(answer.missing, []);
  const body = await textOf(answer.bytes!);
  assert.match(body, /Signed: A\. Perera/);
  assert.match(body, /<w:proofErr w:type="spellStart"\/>/, "the marks between runs are left alone");
  assert.match(body, /<w:bookmarkStart w:id="1" w:name="x"\/>/);
  assert.match(body, / \(director\)/);
  assert.doesNotMatch(body, /\{\{|\}\}|natory/);
});

test("a split hole with no value is still refused, not left in", async () => {
  const file = await docxOfParagraph(run("{{regis") + run("trationNo}}"));
  const answer = await fillDocx(file, {});
  assert.equal(answer.bytes, null);
  assert.deepEqual(answer.missing, ["registrationNo"]);
});
