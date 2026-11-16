/**
 * What may be kept, and under what name. These documents are evidence: the
 * rules here are what stop one overwriting another and what proves a year
 * later that a file is the one that went out.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_FILE_BYTES,
  canBecomePdf,
  extensionOf,
  isFileKind,
  keyFor,
  mimeFor,
  pdfNameFor,
  previewable,
  problemWithUpload,
  safeName,
  sha256,
  sizeInWords,
} from "@/lib/files";

test("a client's file name becomes something safe to store", () => {
  assert.equal(safeName("ESA DRAFT - Best Pacific (final) copy.pdf"), "ESA-DRAFT-Best-Pacific-final-copy.pdf");
  assert.equal(safeName("  weird\"name'.docx "), "weird-name-.docx");
  assert.equal(safeName("***"), "file");
  assert.equal(safeName(String.raw`..\\windows\x.pdf`), "windows-x.pdf", "no path can survive");
  assert.ok(safeName("a".repeat(300) + ".pdf").length <= 120);
});

test("an upload is refused with a reason a person can act on", () => {
  assert.equal(problemWithUpload({ name: "agreement.pdf", size: 1000 }), null);
  assert.match(problemWithUpload({ name: "agreement.pdf", size: 0 }) ?? "", /empty/);
  assert.match(problemWithUpload({ name: "scan.pdf", size: MAX_FILE_BYTES + 1 }) ?? "", /the most we keep is/i);
  assert.match(problemWithUpload({ name: "run.exe", size: 10 }) ?? "", /do not keep \.exe/);
  assert.match(problemWithUpload({ name: "noextension", size: 10 }) ?? "", /what kind of file/);
  assert.match(problemWithUpload({ name: " ", size: 10 }) ?? "", /no name/);
});

test("two files with one name are two files, not one on top of the other", () => {
  const first = keyFor("esa_signed", "esa", "esa_1", "agreement.pdf", 1_000);
  const second = keyFor("esa_signed", "esa", "esa_1", "agreement.pdf", 2_000);
  assert.notEqual(first, second);
  assert.equal(first, "esa_signed/esa/esa_1/1000-agreement.pdf");
});

test("a file belonging to nothing yet still has somewhere to live", () => {
  assert.equal(keyFor("other", null, null, "note.pdf", 5), "other/loose/5-note.pdf");
});

test("the hash is the same for the same bytes and different for different ones", () => {
  const bytes = new TextEncoder().encode("the agreement we sent");
  assert.equal(sha256(bytes), sha256(new TextEncoder().encode("the agreement we sent")));
  assert.notEqual(sha256(bytes), sha256(new TextEncoder().encode("the agreement we sent.")));
  assert.equal(sha256(bytes).length, 64);
});

test("only a Word document can become a PDF", () => {
  assert.equal(canBecomePdf("agreement.docx"), true);
  assert.equal(canBecomePdf("agreement.DOC"), true);
  assert.equal(canBecomePdf("agreement.pdf"), false);
  assert.equal(pdfNameFor("agreement.docx"), "agreement.pdf");
  assert.equal(pdfNameFor("agreement"), "agreement.pdf");
});

test("the browser is told what a file is from its name, never from the sender", () => {
  assert.equal(mimeFor("a.pdf"), "application/pdf");
  assert.equal(mimeFor("a.JPG"), "image/jpeg");
  assert.equal(mimeFor("a.zip"), "application/octet-stream");
  assert.equal(extensionOf("a.b.csv"), ".csv");
  assert.equal(extensionOf("none"), "");
});

test("sizes are said in words", () => {
  assert.equal(sizeInWords(900), "900 bytes");
  assert.equal(sizeInWords(2048), "2 KB");
  assert.equal(sizeInWords(1_500_000), "1.4 MB");
  assert.equal(sizeInWords(MAX_FILE_BYTES), "25 MB");
});

test("a kind we do not know is not quietly accepted", () => {
  assert.equal(isFileKind("esa_signed"), true);
  assert.equal(isFileKind("contract"), false);
});

test("only a PDF or a picture is ever shown in the page; the rest download", () => {
  assert.equal(previewable(mimeFor("cv.pdf")), true);
  assert.equal(previewable(mimeFor("photo.PNG")), true);
  assert.equal(previewable(mimeFor("cv.docx")), false);
  assert.equal(previewable(mimeFor("sheet.csv")), false);
  assert.equal(previewable("image/svg+xml"), false, "a drawing can carry a script");
  assert.equal(previewable("text/html"), false);
});
