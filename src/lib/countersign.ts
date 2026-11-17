/**
 * Countersigning the client's signed agreement (17 Nov, supervisor review).
 *
 * The Director used to sign by hand and somebody uploaded the result, so a
 * signed agreement sat waiting. Now the Director's own signature image, kept
 * once on the Files screen, is stamped on the last page of the client's signed
 * PDF the moment it is recorded. A person still reviews and sends the email
 * that carries it back; nothing waits on this.
 *
 * Pure: bytes in, bytes out. Nothing is stored or sent here.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type StampOutcome = { ok: true; bytes: Uint8Array } | { ok: false; reason: string };

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPG = [0xff, 0xd8, 0xff];
const starts = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

/** `when` is the day, already in words ("17 November 2026"). */
export async function stampCountersignature(
  signedPdf: Uint8Array,
  signature: Uint8Array,
  who: { name: string; when: string },
): Promise<StampOutcome> {
  try {
    const doc = await PDFDocument.load(signedPdf);
    const pages = doc.getPages();
    if (pages.length === 0) return { ok: false, reason: "The signed copy has no pages." };

    const image = starts(signature, PNG)
      ? await doc.embedPng(signature)
      : starts(signature, JPG)
        ? await doc.embedJpg(signature)
        : null;
    if (!image) return { ok: false, reason: "The Director's signature must be a PNG or JPG picture." };

    const page = pages[pages.length - 1];
    const { width } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const boxWidth = 150;
    const boxHeight = Math.min(60, (image.height / image.width) * boxWidth);
    const x = width - boxWidth - 48;
    const y = 72;

    page.drawImage(image, { x, y: y + 16, width: boxWidth, height: boxHeight });
    page.drawText("Countersigned for Career 141", { x, y: y + 4, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(who.name + " · " + who.when, { x, y: y - 6, size: 8, font, color: rgb(0.25, 0.25, 0.25) });

    return { ok: true, bytes: await doc.save() };
  } catch {
    return { ok: false, reason: "The signed copy could not be read as a PDF." };
  }
}
