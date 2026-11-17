import { desk, fileIn } from "@/data/desk";
import { readBytes } from "@/data/fileStore";
import { docxToHtmlPage } from "@/lib/docxHtml";
import { readingPdf } from "@/lib/docxPdf";
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
  // A PDF to read, so the draft opens as one on a laptop too; the web page is only if that cannot be built.
  if (!asPage) try {
    const pdf = await readingPdf(Buffer.from(bytes), row.name);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="' + row.name.replace(/\.docx$/i, "") + ' (reading copy).pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // fall through to the page
  }
  try {
    const page = await docxToHtmlPage(Buffer.from(bytes), row.name);
    return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response("That file could not be read as a Word document. Download it instead.", { status: 422 });
  }
}
