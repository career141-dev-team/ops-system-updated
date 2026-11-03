/**
 * The PDF step. The conversion itself is LibreOffice's work and is proved on
 * the server, where LibreOffice is installed; what is proved here is that a
 * machine without it says so instead of failing in a way nobody can read.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { docxToPdf } from "@/lib/docxToPdf";

test("no LibreOffice means a sentence, not a crash", async () => {
  process.env.SOFFICE_PATH = "soffice-that-is-not-installed";
  const made = await docxToPdf(new TextEncoder().encode("not really a document"), "agreement.docx");
  assert.equal(made.ok, false);
  assert.equal(made.bytes, null);
  assert.match(made.reason ?? "", /not installed on this machine/);
});

test("two at once both get an answer, and the queue survives a failure", async () => {
  process.env.SOFFICE_PATH = "soffice-that-is-not-installed";
  const bytes = new TextEncoder().encode("x");
  const both = await Promise.all([docxToPdf(bytes, "a.docx"), docxToPdf(bytes, "b.docx")]);
  assert.equal(both.length, 2);
  for (const made of both) assert.match(made.reason ?? "", /not installed/);
});
