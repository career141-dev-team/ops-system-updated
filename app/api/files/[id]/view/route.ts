import { desk, fileIn } from "@/data/desk";
import { readBytes } from "@/data/fileStore";
import { docxToHtmlPage } from "@/lib/docxHtml";
import { readingPdf } from "@/lib/docxPdf";
import { docxToPdf } from "@/lib/docxToPdf";
import { viewHref } from "@/lib/files";
import { currentMember } from "@/lib/session";

/**
 * A Word file read as a PDF (or, failing that, a page), so the filled agreement can be
 * looked at in a new tab before it is sent (17 Nov). Signed-in people only, like the download.
 * Anything that is not a .docx goes to the ordinary file route.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const member = await currentMember();
  if (!member) return new Response("Sign in first.", { status: 401 });

  const { id } = await params;
  const row = fileIn(await desk(), id);
  if (!row) return new Response("There is no such file.", { status: 404 });

  const href = viewHref(row);
  if (!href.endsWith("/view")) return Response.redirect(new URL(href, request.url), 302);

  const bytes = await readBytes(row.key);
  if (!bytes) return new Response("The file is missing from storage.", { status: 404 });
  // `?as=html` is the page shown inside the lead page where a PDF cannot be (17 Nov).
  const asPage = new URL(request.url).searchParams.get("as") === "html";
  const asPdf = (pdf: Uint8Array, suffix: string) =>
    new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="' + row.name.replace(/\.docx$/i, "") + suffix + '.pdf"',
        "Cache-Control": "no-store",
      },
    });
  if (!asPage) {
    // LibreOffice first (18 Nov): it keeps the letterhead, header, footer, pictures and
    // numbering, and it is the same PDF that is emailed. The plain reading copy dropped
    // all of that, so the owner saw an agreement that looked nothing like the template.
    const real = await docxToPdf(bytes, row.name);
    if (real.ok && real.bytes) return asPdf(real.bytes, "");
    // A laptop has no LibreOffice: the plain reading copy, which says so in its footer.
    try {
      return asPdf(await readingPdf(Buffer.from(bytes), row.name), " (reading copy)");
    } catch {
      // fall through to the page
    }
  }
  try {
    const page = await docxToHtmlPage(Buffer.from(bytes), row.name);
    return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response("That file could not be read as a Word document. Download it instead.", { status: 422 });
  }
}
