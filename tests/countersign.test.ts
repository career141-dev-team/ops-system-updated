/** Stamping the Director's signature on the client's signed agreement. */
import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import { stampCountersignature } from "@/lib/countersign";

// A real 1x1 PNG.
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

async function twoPagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  doc.addPage([595, 842]);
  return doc.save();
}

test("the signature is stamped on the last page and the page count is unchanged", async () => {
  const signed = await twoPagePdf();
  const out = await stampCountersignature(signed, PNG, { name: "The Director", when: "17 November 2026" });
  assert.equal(out.ok, true);
  if (!out.ok) return;

  const stamped = await PDFDocument.load(out.bytes);
  assert.equal(stamped.getPageCount(), 2);
  // The last page grew an image; the first page is as it was.
  const last = stamped.getPage(1).node.Resources()?.lookup(await import("pdf-lib").then((m) => m.PDFName.of("XObject")));
  assert.ok(last, "the last page has the signature picture");
  assert.ok(out.bytes.byteLength > signed.byteLength);
});

test("a picture that is not PNG or JPG is refused in words", async () => {
  const out = await stampCountersignature(await twoPagePdf(), Uint8Array.from([1, 2, 3]), { name: "D", when: "today" });
  assert.equal(out.ok, false);
  if (!out.ok) assert.match(out.reason, /PNG or JPG/);
});

test("something that is not a PDF is refused in words, not thrown", async () => {
  const out = await stampCountersignature(Uint8Array.from([1, 2, 3]), PNG, { name: "D", when: "today" });
  assert.equal(out.ok, false);
  if (!out.ok) assert.match(out.reason, /PDF/);
});
