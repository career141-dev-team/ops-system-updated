/**
 * A .docx as a page a browser can show (17 Nov).
 *
 * The filled agreement is a Word file, and a browser cannot open one, so on a
 * laptop (no LibreOffice, so no PDF) there was nothing to look at before it
 * went out. This reads `word/document.xml` with JSZip, which is already here,
 * and keeps what matters for reading an agreement: paragraphs, bold, italic,
 * underline, centred and right-aligned lines, tabs and line breaks.
 *
 * shortcut: tables become plain paragraphs and pictures are left out, because the
 * ESA has neither that matters; the real file (and the PDF on a server) is the
 * truth. Upgrade to mammoth if a template ever needs its tables kept.
 */

import JSZip from "jszip";

const PARAGRAPH = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;

/** The text of one run, with tabs and breaks. The XML's own escapes (&amp;) are already HTML-safe. */
function runText(run: string): string {
  let out = "";
  for (const part of run.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
    out += part[0] === "<w:tab/>" ? "&emsp;" : part[0] === "<w:br/>" ? "<br>" : part[1].replace(/&apos;/g, "&#39;");
  }
  return out;
}

export function docxXmlToHtml(xml: string): string {
  const lines = [...xml.matchAll(PARAGRAPH)].map((para) => {
    const p = para[0];
    const runs = [...p.matchAll(RUN)].map((m) => {
      const run = m[0];
      let text = runText(run);
      if (!text) return "";
      if (/<w:b\/>|<w:b w:val="(?:1|true)"\/>/.test(run)) text = `<b>${text}</b>`;
      if (/<w:i\/>|<w:i w:val="(?:1|true)"\/>/.test(run)) text = `<i>${text}</i>`;
      if (/<w:u [^>]*w:val="(?!none)[^"]*"/.test(run)) text = `<u>${text}</u>`;
      return text;
    });
    const html = runs.join("");
    const align = /<w:jc w:val="(center|right)"\/>/.exec(p)?.[1];
    return html ? `<p${align ? ` style="text-align:${align}"` : ""}>${html}</p>` : "<p>&nbsp;</p>";
  });
  return lines.join("\n");
}

/** The whole page: white, printable, titled with the file's name. */
export async function docxToHtmlPage(file: Buffer, title: string): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("Not a Word document");
  const body = docxXmlToHtml(await part.async("string"));
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>
body{margin:0;background:#f3f3f1;color:#111;font:15px/1.55 Georgia,'Times New Roman',serif}
main{max-width:780px;margin:24px auto;padding:56px 64px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.12)}
p{margin:0 0 .6em}
.bar{max-width:780px;margin:16px auto 0;font:13px system-ui,sans-serif;color:#555}
@media print{body{background:#fff}main{box-shadow:none;margin:0;padding:0}.bar{display:none}}
@media(max-width:700px){main{padding:24px 18px;margin:0}}
</style></head><body><div class="bar">${safeTitle} · a reading copy; the Word or PDF file is the agreement · <a href="#" onclick="print();return false">Print or save as PDF</a></div><main>
${body}
</main></body></html>`;
}
