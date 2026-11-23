import "server-only";

import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * The text of a CV file (23 Nov). A PDF is read page by page; a Word .docx is its document.xml with the tags
 * taken out. An old binary .doc is not read: it says so, and a person types the five things.
 * A file that cannot be read comes back as an empty string, never as an exception that stops the rest of a Scoop.
 */
export async function cvText(bytes: Uint8Array, name: string): Promise<{ text: string; why: string | null }> {
  const lower = name.toLowerCase();
  try {
    if (bytes[0] === 0x25 && bytes[1] === 0x50) {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: text.slice(0, 20_000), why: null };
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && lower.endsWith(".docx")) {
      const zip = await JSZip.loadAsync(bytes);
      const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
      const text = xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:tab\/>/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      return { text: text.slice(0, 20_000), why: null };
    }
    return { text: "", why: "An old Word (.doc) file cannot be read. Save it as a PDF or .docx." };
  } catch (e) {
    return { text: "", why: "The file could not be opened: " + String((e as Error)?.message ?? e).slice(0, 120) };
  }
}
