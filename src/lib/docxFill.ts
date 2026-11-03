/**
 * Filling the agreement template (15, Phase 2 step 10).
 *
 * A .docx is a zip of XML. The holes in our template are written
 * `{{likeThis}}`, each one inside a single run of text, so filling it is a
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

/** Every hole in the template, each one once, in the order they appear. */
export function holesIn(xml: string): string[] {
  const names: string[] = [];
  for (const match of xml.matchAll(HOLE)) {
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
export async function fillDocx(file: Buffer, values: Record<string, string>): Promise<FillAnswer> {
  const zip = await JSZip.loadAsync(file);
  const missing: string[] = [];
  const filled: string[] = [];

  for (const path of Object.keys(zip.files)) {
    if (!TEXT_PARTS.test(path)) continue;
    const xml = await zip.file(path)!.async("string");
    const next = xml.replace(HOLE, (whole, name: string) => {
      const value = (values[name] ?? "").trim();
      if (!value) {
        if (!missing.includes(name)) missing.push(name);
        return whole;
      }
      if (!filled.includes(name)) filled.push(name);
      return forXml(value);
    });
    if (next !== xml) zip.file(path, next);
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
