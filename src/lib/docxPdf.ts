/**
 * A .docx as a PDF to read (17 Nov).
 *
 * On the server LibreOffice makes the real PDF. A laptop has none, so the person
 * drafting the agreement had only a Word file or a web page to check. This lays the
 * document's paragraphs out on A4 with pdf-lib, which is already here, so the draft
 * can be read as a PDF anywhere. It is a reading copy and says so in its footer: it
 * is never stored and never attached to anything sent to a client.
 *
 * shortcut: plain Times, bold runs, centred and right-aligned lines; no tables,
 * pictures, headers or the document's own page breaks. Characters the standard font
 * cannot draw become "?". Upgrade to LibreOffice's PDF (the server has it) for fidelity.
 */

import JSZip from "jszip";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

export interface DocxParagraph {
  /** `joined`: no space before it, the rest of a word Word split over two runs ("R" + "ESPONSE"). */
  words: { text: string; bold: boolean; joined?: true }[];
  align: "left" | "center" | "right";
}

const PARAGRAPH = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
const TEXT = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;

const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** What the standard Times font can draw; anything else is shown as "?". */
const DRAWABLE = /[ -~ -ÿ–—‘’“”•…]/;
export const drawable = (s: string) => [...s].map((c) => (DRAWABLE.test(c) ? c : "?")).join("");

export function docxParagraphs(xml: string): DocxParagraph[] {
  return [...xml.matchAll(PARAGRAPH)].map((para) => {
    const p = para[0];
    const words: DocxParagraph["words"] = [];
    let open = false; // the text so far ends inside a word, so the next run may continue it
    for (const run of p.matchAll(RUN)) {
      const bold = /<w:b\/>|<w:b w:val="(?:1|true)"\/>/.test(run[0]);
      let text = "";
      for (const part of run[0].matchAll(TEXT)) {
        text += part[0] === "<w:tab/>" ? "    " : part[0] === "<w:br/>" ? "\n" : unescapeXml(part[1]);
      }
      const clean = drawable(text.replace(/\n/g, " "));
      clean.split(/ +/).forEach((word, i) => {
        if (word) words.push(i === 0 && open && words.length ? { text: word, bold, joined: true } : { text: word, bold });
      });
      if (clean) open = !/\s$/.test(clean);
    }
    const align = /<w:jc w:val="(center|right)"\/>/.exec(p)?.[1] as "center" | "right" | undefined;
    return { words, align: align ?? "left" };
  });
}

const PAGE = { w: 595, h: 842, margin: 56, size: 11, leading: 15 };

export async function readingPdf(file: Buffer, title: string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(file);
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("Not a Word document");
  const paragraphs = docxParagraphs(await part.async("string"));

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const small = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.setTitle(drawable(title));

  const width = (word: { text: string; bold: boolean }) => (word.bold ? bold : regular).widthOfTextAtSize(word.text, PAGE.size);
  // A little wider than Times' own space: the font is not embedded, and a viewer that swaps in a slightly
  // wider Times (MuPDF does) would run an all-capitals word into the next one.
  const space = regular.widthOfTextAtSize(" ", PAGE.size) * 1.5;
  const room = PAGE.w - PAGE.margin * 2;

  let page = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.margin;
  const line = (words: DocxParagraph["words"][], align: DocxParagraph["align"]) => {
    if (y < PAGE.margin + PAGE.leading) {
      page = pdf.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - PAGE.margin;
    }
    const total = words.reduce((n, w) => n + w.reduce((m, seg) => m + width(seg), 0), 0) + space * Math.max(0, words.length - 1);
    let x = align === "center" ? PAGE.margin + (room - total) / 2 : align === "right" ? PAGE.margin + room - total : PAGE.margin;
    for (const w of words) {
      for (const seg of w) {
        const font: PDFFont = seg.bold ? bold : regular;
        page.drawText(seg.text, { x, y, size: PAGE.size, font });
        x += width(seg);
      }
      x += space;
    }
    y -= PAGE.leading;
  };

  type Word = DocxParagraph["words"];
  const wordWidth = (w: Word) => w.reduce((n, seg) => n + width(seg), 0);
  for (const para of paragraphs) {
    const groups: Word[] = [];
    for (const seg of para.words) {
      if (seg.joined && groups.length) groups[groups.length - 1].push(seg);
      else groups.push([seg]);
    }
    if (!groups.length) {
      y -= PAGE.leading / 2;
      continue;
    }
    let current: Word[] = [];
    let used = 0;
    for (const w of groups) {
      const next = wordWidth(w) + (current.length ? space : 0);
      if (current.length && used + next > room) {
        line(current, para.align);
        current = [];
        used = 0;
      }
      current.push(w);
      used += wordWidth(w) + (current.length > 1 ? space : 0);
    }
    if (current.length) line(current, para.align);
    y -= 4;
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) =>
    p.drawText(`Reading copy of the drafted agreement · page ${i + 1} of ${pages.length}`, {
      x: PAGE.margin,
      y: 28,
      size: 8,
      font: small,
    }),
  );
  return pdf.save();
}
