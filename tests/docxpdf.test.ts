/**
 * The drafted agreement as a PDF to read on a machine with no LibreOffice (17 Nov).
 */
import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import { docxParagraphs, readingPdf } from "@/lib/docxPdf";

const para = (text: string, props = "", ppr = "") =>
  `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const docx = async (body: string) => {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
};

test("paragraphs keep bold and centring, and the XML escapes become text", () => {
  const out = docxParagraphs(para("AGREE AS FOLLOWS", "<w:b/>", '<w:jc w:val="center"/>') + para("Smith &amp; Co"));
  assert.deepEqual(out[0], { words: [{ text: "AGREE", bold: true }, { text: "AS", bold: true }, { text: "FOLLOWS", bold: true }], align: "center" });
  assert.equal(out[1].words.map((w) => w.text).join(" "), "Smith & Co");
});

test("a long agreement becomes a real multi-page PDF, and a letter the font cannot draw does not break it", async () => {
  const body = Array.from({ length: 120 }, (_, i) => para(`${i + 1}. Clause about Smith &amp; Co and the fee, with some words to wrap across the line. ශ end.`)).join("");
  const bytes = await readingPdf(await docx(body), "Agreement - Smith - v1.docx");
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  const pages = (await PDFDocument.load(bytes)).getPageCount();
  assert.ok(pages >= 3, "120 paragraphs run over several pages, got " + pages);
});

test("a file that is not a Word document is refused", async () => {
  const zip = new JSZip();
  zip.file("readme.txt", "x");
  await assert.rejects(readingPdf(await zip.generateAsync({ type: "nodebuffer" }), "x.docx"));
});

test("a word that Word split over two runs stays one word (R + ESPONSE TIME in the owner's ESA)", () => {
  const xml = `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>R</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>ESPONSE TIME</w:t></w:r></w:p>`;
  assert.deepEqual(docxParagraphs(xml)[0].words, [
    { text: "R", bold: true },
    { text: "ESPONSE", bold: true, joined: true },
    { text: "TIME", bold: true },
  ]);
  // A run that starts after a space is a new word.
  const apart = docxParagraphs(`<w:p><w:r><w:t xml:space="preserve">Smith </w:t></w:r><w:r><w:t>Co</w:t></w:r></w:p>`)[0].words;
  assert.equal(apart[1].joined, undefined);
});
