/**
 * Filling the agreement template (15, Phase 2 step 10).
 *
 * A .docx is a zip of XML. The holes in our template are written
 * `{{likeThis}}`. Word often splits one hole over several runs of text, so
 * `joinSplitHoles` gathers it back into one run first. Filling is then a
 * replacement in `word/document.xml` and nothing else in the document moves -
 * no styles, no page breaks, no signature block.
 *
 * The owner's incident is the whole reason this is strict: a draft went to a
 * client with placeholders still in it. So a hole we have no value for is
 * never quietly left behind and never blanked - the fill refuses and says
 * which hole it was.
 */

import JSZip from "jszip";

/** Where the text of a .docx lives, including its headers and footers. */
const TEXT_PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

const HOLE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

const PARAGRAPH = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
const TEXT = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

/**
 * Puts a hole that Word split over several runs back into one run (16 Nov).
 *
 * Before this, `{{companyName}}` stored as `{{company` + `Name}}` was not found
 * by the fill at all and went to the client as it was. The whole hole moves
 * into the run it started in (so it keeps that run's look), the fragments are
 * cut out of the runs after it, and anything between the runs (spell-check
 * marks, bookmarks) is left alone. Paragraphs with no split hole are untouched.
 */
export function joinSplitHoles(xml: string): string {
  return xml.replace(PARAGRAPH, (para) => {
    const runs = [...para.matchAll(RUN)].map((m) => ({
      at: m.index!,
      raw: m[0],
      text: [...m[0].matchAll(TEXT)].map((t) => t[1]).join(""),
    }));
    if (runs.length < 2) return para;
    const starts: number[] = [];
    let full = "";
    for (const run of runs) {
      starts.push(full.length);
      full += run.text;
    }
    const runAt = (offset: number) => {
      let k = runs.length - 1;
      while (starts[k] > offset) k--;
      return k;
    };
    const edits: { from: number; to: number; with: string }[][] = runs.map(() => []);
    for (const hole of full.matchAll(HOLE)) {
      const start = hole.index!;
      const end = start + hole[0].length;
      const a = runAt(start);
      const b = runAt(end - 1);
      if (a === b) continue;
      edits[a].push({ from: start - starts[a], to: runs[a].text.length, with: hole[0] });
      for (let k = a + 1; k < b; k++) edits[k].push({ from: 0, to: runs[k].text.length, with: "" });
      edits[b].push({ from: 0, to: end - starts[b], with: "" });
    }
    let out = para;
    for (let k = runs.length - 1; k >= 0; k--) {
      if (!edits[k].length) continue;
      let text = runs[k].text;
      for (const e of edits[k].sort((x, y) => y.from - x.from)) text = text.slice(0, e.from) + e.with + text.slice(e.to);
      let first = true;
      const raw = runs[k].raw.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:t\/>/g, () => {
        if (!first) return "";
        first = false;
        return `<w:t xml:space="preserve">${text}</w:t>`;
      });
      out = out.slice(0, runs[k].at) + raw + out.slice(runs[k].at + runs[k].raw.length);
    }
    return out;
  });
}

/** Every hole in the template, each one once, in the order they appear. */
export function holesIn(xml: string): string[] {
  const names: string[] = [];
  for (const match of joinSplitHoles(xml).matchAll(HOLE)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * What a hole becomes.
 *
 * XML, not text: a client called "Smith & Co" would otherwise break the
 * document it is being written into.
 */
export function forXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface FillAnswer {
  /** The filled document, or nothing when a hole could not be filled. */
  bytes: Buffer | null;
  /** The holes we had no value for. The draft is refused while this is not empty. */
  missing: string[];
  /** The holes that were filled, for the record. */
  filled: string[];
}

/** Reads the holes out of a template without changing it. */
export async function holesInDocx(file: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const names: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (!TEXT_PARTS.test(path)) continue;
    const xml = await zip.file(path)!.async("string");
    for (const hole of holesIn(xml)) if (!names.includes(hole)) names.push(hole);
  }
  return names;
}

/**
 * Fills a template.
 *
 * A value that is blank counts as no value: an agreement that says "between
 * CAREER CONSULTANTS PVT LTD and  " is worse than one that was never sent.
 */
const AFTER_HIGHLIGHT = /<w:(?:u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath)[\s/>]/;

/** A run's properties with a yellow highlight added, in the place Word reads it from. */
function highlighted(rPr: string): string {
  const mark = '<w:highlight w:val="yellow"/>';
  // The owner's template writes an empty one as <w:rPr/>, and some holes are highlighted already (26 Nov).
  if (!rPr || rPr === "<w:rPr/>") return `<w:rPr>${mark}</w:rPr>`;
  if (rPr.includes("<w:highlight ")) return rPr;
  const at = rPr.search(AFTER_HIGHLIGHT);
  return at >= 0 ? rPr.slice(0, at) + mark + rPr.slice(at) : rPr.replace("</w:rPr>", mark + "</w:rPr>");
}

/**
 * 26 Nov (Nov 25 ops meeting), Draft agreements only: a blank hole named in `tbc` becomes a
 * yellow-highlighted run saying `text`. The hole's run is split around it so the words either side keep
 * their look. A run this cannot read (more than one text part) is left alone, and the normal pass then
 * refuses the blank as it always did, so the exception cannot leak into a final agreement.
 */
function markBlanks(xml: string, values: Record<string, string>, tbc: string[], text: string): string {
  const one = /^(<w:r(?:\s[^>]*)?>)(<w:rPr\/>|<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:\s[^>]*)?>([^<]*)<\/w:t><\/w:r>$/;
  const holeOnly = /^\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}$/;
  const isBlank = (piece: string) => {
    const name = holeOnly.exec(piece)?.[1];
    return !!name && tbc.includes(name) && !(values[name] ?? "").trim();
  };
  return xml.replace(RUN, (run) => {
    const m = one.exec(run);
    if (!m) return run;
    const [, open, rPr = "", body] = m;
    const pieces = body.split(/(\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\})/).filter((piece) => piece !== "");
    if (!pieces.some(isBlank)) return run;
    return pieces
      .map((piece) =>
        isBlank(piece)
          ? `${open}${highlighted(rPr)}<w:t xml:space="preserve">${forXml(text)}</w:t></w:r>`
          : `${open}${rPr}<w:t xml:space="preserve">${piece}</w:t></w:r>`,
      )
      .join("");
  });
}

/**
 * `draft` (26 Nov, Nov 25 ops meeting): the holes named in `blanks` may be empty and print as a
 * highlighted `text`; `note` goes in as a highlighted line at the top of the document, because the
 * owner's template has no hole for it. Every other blank still refuses.
 */
export async function fillDocx(
  file: Buffer,
  values: Record<string, string>,
  draft?: { blanks: string[]; text: string; note: string },
): Promise<FillAnswer> {
  const zip = await JSZip.loadAsync(file);
  const missing: string[] = [];
  const filled: string[] = [];

  for (const path of Object.keys(zip.files)) {
    if (!TEXT_PARTS.test(path)) continue;
    let xml = joinSplitHoles(await zip.file(path)!.async("string"));
    if (draft) {
      xml = markBlanks(xml, values, draft.blanks, draft.text);
      if (path === "word/document.xml") {
        const note = `<w:p><w:r><w:rPr><w:b/><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">${forXml(draft.note)}</w:t></w:r></w:p>`;
        xml = xml.replace(/<w:body>/, "<w:body>" + note);
      }
    }
    const next = xml.replace(HOLE, (whole, name: string) => {
      const value = (values[name] ?? "").trim();
      if (!value) {
        if (!missing.includes(name)) missing.push(name);
        return whole;
      }
      if (!filled.includes(name)) filled.push(name);
      return forXml(value);
    });
    zip.file(path, next);
  }

  if (missing.length) return { bytes: null, missing, filled };
  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { bytes, missing: [], filled };
}

/** Why the agreement cannot be made, in words a person can act on. */
export function problemWithFill(missing: string[], labelOf: (key: string) => string): string | null {
  if (!missing.length) return null;
  const names = missing.map((key) => labelOf(key).toLowerCase()).join(", ");
  return (
    "The agreement has holes nothing fills: " +
    names +
    ". Either fill them in above, or take them out of the template - a draft went to a client with placeholders in it once."
  );
}
