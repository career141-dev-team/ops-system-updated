/**
 * A filled agreement read as a page in a new tab (17 Nov).
 */
import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { docxToHtmlPage, docxXmlToHtml } from "@/lib/docxHtml";

const para = (inner: string, props = "") => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${inner}</w:p>`;
const run = (text: string, props = "") => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

test("paragraphs keep bold, centring and the company name's ampersand", () => {
  const html = docxXmlToHtml(
    para(run("AGREE AS FOLLOWS", "<w:b/>"), '<w:jc w:val="center"/>') + para(run("Smith &amp; Co ") + run("Ltd", "<w:i/>")) + para(""),
  );
  assert.match(html, /<p style="text-align:center"><b>AGREE AS FOLLOWS<\/b><\/p>/);
  assert.match(html, /<p>Smith &amp; Co <i>Ltd<\/i><\/p>/);
  assert.match(html, /<p>&nbsp;<\/p>/, "an empty paragraph keeps its space");
});

test("a whole .docx becomes a titled page, and a non-Word file is refused", async () => {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document><w:body>${para(run("VALTRIX PVT LTD"))}</w:body></w:document>`);
  const page = await docxToHtmlPage(await zip.generateAsync({ type: "nodebuffer" }), "Agreement - <Valtrix> - v1.docx");
  assert.match(page, /<title>Agreement - &lt;Valtrix&gt; - v1\.docx<\/title>/);
  assert.match(page, /<p>VALTRIX PVT LTD<\/p>/);

  const notWord = new JSZip();
  notWord.file("readme.txt", "x");
  await assert.rejects(docxToHtmlPage(await notWord.generateAsync({ type: "nodebuffer" }), "x.docx"));
});
