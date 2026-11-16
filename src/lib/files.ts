/**
 * What may be kept, and under what name (15, Phase 1 step 23).
 *
 * The documents of this business are the agreement, the signed scan of it, the
 * CVs that went to a client, the invoice and the offer letter. They are
 * evidence: a year later somebody has to be able to say which version went
 * out, so a file is never overwritten and its name never decides where it
 * lives. Everything that could be wrong about a file is decided here, where it
 * is tested; putting the bytes somewhere is the next file along.
 */

import { createHash } from "node:crypto";

/** The kinds of document Ops keeps, from the plan's file registry. */
export const FILE_KINDS = [
  "esa_draft",
  "esa_signed",
  "esa_countersigned",
  "cv",
  "invoice",
  "invoice_template",
  "credit_note_template",
  "offer_letter",
  "flyer",
  "scan",
  "other",
] as const;

export type FileKind = (typeof FILE_KINDS)[number];

/** In the words the screen shows, so nobody has to read "esa_countersigned". */
export const KIND_MEANINGS: Record<FileKind, string> = {
  esa_draft: "Agreement, drafted",
  esa_signed: "Agreement, signed by the client",
  esa_countersigned: "Agreement, countersigned by the Director",
  cv: "A CV, as it went to the client",
  invoice: "Invoice",
  invoice_template: "Invoice template (Word, with {{holes}})",
  credit_note_template: "Credit note template (Word, with {{holes}})",
  offer_letter: "Offer letter",
  flyer: "Advert flyer",
  scan: "A scan of something on paper",
  other: "Something else",
};

export function isFileKind(value: string): value is FileKind {
  return (FILE_KINDS as readonly string[]).includes(value);
}

/**
 * 25 MB. Not a technical limit: it is about what a client's mail server will
 * accept, and a document bigger than this is a scan at the wrong setting.
 */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** What we are willing to keep, by the end of the name. */
const ALLOWED = [".pdf", ".docx", ".doc", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp"];

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * A name that is safe to put in a key and in a Content-Disposition header.
 *
 * Client documents arrive called things like "ESA DRAFT - Best Pacific
 * Textiles Lanka (final) copy.pdf", with spaces, brackets and sometimes a
 * comma or a quote - none of which belong in a storage key.
 */
export function safeName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^A-Za-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(-120);
  return cleaned || "file";
}

/** Why this upload cannot be kept, in a sentence, or nothing if it can. */
export function problemWithUpload(file: { name: string; size: number }): string | null {
  if (!file.name.trim()) return "The file has no name.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_FILE_BYTES) {
    return "The file is " + sizeInWords(file.size) + ". The most we keep is " + sizeInWords(MAX_FILE_BYTES) + ".";
  }
  const ext = extensionOf(file.name);
  if (!ext) return "The file name does not say what kind of file it is.";
  if (!ALLOWED.includes(ext)) {
    return "We do not keep " + ext + " files. Documents, spreadsheets and pictures only.";
  }
  return null;
}

/**
 * Where a file lives.
 *
 * The subject comes first so everything about one agreement or one invoice is
 * together, and the time is in the key so the same name twice is two files
 * rather than one overwriting the other - which is the whole point for a
 * document that was sent to a client.
 */
export function keyFor(
  kind: FileKind,
  subjectType: string | null,
  subjectId: string | null,
  name: string,
  now = Date.now(),
): string {
  const where = subjectType && subjectId ? subjectType + "/" + subjectId : "loose";
  return [kind, where, now + "-" + safeName(name)].join("/");
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sizeInWords(bytes: number): string {
  if (bytes < 1024) return bytes + " bytes";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  const mb = bytes / (1024 * 1024);
  return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + " MB";
}

/** A PDF can be made of these, and only these. */
export function canBecomePdf(name: string): boolean {
  return [".docx", ".doc"].includes(extensionOf(name));
}

export function pdfNameFor(name: string): string {
  const ext = extensionOf(name);
  return (ext ? name.slice(0, -ext.length) : name) + ".pdf";
}

/** May a browser show it in the page (16 Nov, To approve's file view)? Only a PDF or a picture; anything else is a download. */
export function previewable(mime: string): boolean {
  return mime === "application/pdf" || /^image\/(png|jpeg|webp)$/.test(mime);
}

/** What a browser should call it. Guessed from the name; we never trust the sender's. */
export function mimeFor(name: string): string {
  switch (extensionOf(name)) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".doc":
      return "application/msword";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".csv":
      return "text/csv";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * The template in use: the newest file of this kind that belongs to nothing
 * (16 Nov). Before, the first one uploaded won, so a corrected agreement
 * template was silently ignored and the old wording kept going out.
 */
export function currentTemplate<T extends { kind: string; subjectType: string | null; uploadedAt: number }>(
  files: T[],
  kind: string,
): T | null {
  let best: T | null = null;
  for (const f of files) {
    if (f.kind === kind && f.subjectType === null && (!best || f.uploadedAt > best.uploadedAt)) best = f;
  }
  return best;
}
