import { redirect } from "next/navigation";

import { keepFile, makePdfOfFile } from "@/app/actions";
import { desk, filesNewestFirst } from "@/data/desk";
import { fileStoreInWords, readBytes, usingR2 } from "@/data/fileStore";
import { holesInDocx } from "@/lib/docxFill";
import { checkTemplate } from "@/lib/esa";
import { checkInvoiceTemplate } from "@/lib/invoiceDoc";
import { FILE_KINDS, KIND_MEANINGS, MAX_FILE_BYTES, canBecomePdf, currentTemplate, sizeInWords } from "@/lib/files";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The files (15, Phase 1 step 23).
 *
 * One page: what we keep, and the form to keep another, because a separate
 * upload screen would be a second place to look for the same thing. Every row
 * says what it is, which agreement or invoice it belongs to, and how big it
 * is; the name is a link, and the link asks who you are before it gives you
 * the file.
 *
 * A Word document gets a "Make a PDF" button next to it, which is the whole of
 * the document step at this stage: the agreement and the invoice come in Phase
 * 2 and Phase 6, and this is the piece they will both use.
 */
export default async function FilesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayKeep = can(member, "file.keep");

  const db = await desk();
  const files = filesNewestFirst(db);
  const templates = files.filter((f) => f.kind === "esa_draft" && f.subjectType === null);
  const current = currentTemplate(files, "esa_draft");
  // A template that is not a readable .docx (a PDF, a damaged file) is said so, not thrown.
  let holes: string[] | null = null;
  if (current) {
    try {
      const bytes = await readBytes(current.key);
      holes = bytes ? await holesInDocx(Buffer.from(bytes)) : null;
    } catch {
      holes = null;
    }
  }
  const check = holes ? checkTemplate(holes) : null;

  // The invoice template, checked the same way (owner, 17 Nov).
  const invoiceTemplates = files.filter((f) => f.kind === "invoice_template" && f.subjectType === null);
  const invoiceCurrent = currentTemplate(files, "invoice_template");
  let invoiceHoles: string[] | null = null;
  if (invoiceCurrent) {
    try {
      const bytes = await readBytes(invoiceCurrent.key);
      invoiceHoles = bytes ? await holesInDocx(Buffer.from(bytes)) : null;
    } catch {
      invoiceHoles = null;
    }
  }
  const invoiceCheck = invoiceHoles ? checkInvoiceTemplate(invoiceHoles) : null;
  const field = "rounded-[10px] border border-rule bg-surface px-3.5 py-2.5 text-[14px]";

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">Files</h1>
        <p className="t-small text-ink-3">
        Agreements, signed copies, CVs as they went out, invoices and offer letters. Nothing here is public.
      </p>
      </div>

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">Keep a file</h2>
        {mayKeep ? (
          <form action={keepFile} className="mt-3 flex flex-col gap-3">
            <input type="file" name="file" required className={field} />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                What it is
                <select name="kind" className={field} defaultValue="other">
                  {FILE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_MEANINGS[kind]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                What it belongs to
                <input name="subjectType" placeholder="esa, invoice, set" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Which one
                <input name="subjectId" placeholder="its id" className={field} />
              </label>
            </div>
            <button className="self-start rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium hover:bg-sunk">
              Keep it
            </button>
            <p className="text-[12px] text-ink-faint">
              Documents, spreadsheets and pictures, up to {sizeInWords(MAX_FILE_BYTES)}. Leave the last two empty for
              something that belongs to nothing yet.
            </p>
          </form>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">{refusal("file.keep")}</p>
        )}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">The agreement template</h2>
        {templates.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-soft">
            None yet. Keep the ESA as a Word file above, as &ldquo;Agreement, drafted&rdquo; with nothing it belongs to.
            Write each blank as {"{{companyName}}"}; the newest upload is the one in use.
          </p>
        ) : (
          <>
            {templates.map((file, i) => (
              <div key={file.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 first:border-t-0">
                <a href={"/api/files/" + file.id} className="text-[13.5px] text-brand hover:underline">
                  {file.name}
                </a>
                <span className="text-[12px] text-ink-faint">
                  {new Date(file.uploadedAt).toISOString().slice(0, 16).replace("T", " ")}
                </span>
                {i === 0 && <span className="text-[12px] font-medium text-ok">in use</span>}
              </div>
            ))}
            <div className="mt-2 border-t border-rule pt-2 text-[13px]">
              {holes === null ? (
                <p className="text-ink-soft">The template in use could not be read as a Word file, so it cannot be checked.</p>
              ) : check && check.unknown.length === 0 && check.unused.length === 0 ? (
                <p className="text-ok">Every blank in it is something we fill, and every required field has a blank.</p>
              ) : (
                check && (
                  <>
                    {check.unknown.length > 0 && (
                      <p>
                        Blanks nothing fills (a send will refuse): {check.unknown.map((h) => "{{" + h + "}}").join(", ")}.
                      </p>
                    )}
                    {check.unused.length > 0 && (
                      <p className="mt-1">
                        Required fields the template never prints: {check.unused.map((f) => f.label.toLowerCase()).join(", ")}.
                      </p>
                    )}
                  </>
                )
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">The invoice template</h2>
        {invoiceTemplates.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-soft">
            None yet. Keep the invoice as a Word file above, as &ldquo;Invoice template&rdquo; with nothing it belongs to. Write each
            changing value as {"{{amount}}"}, {"{{candidateName}}"} and so on; your bank details stay as plain text in it. The newest upload is the one in use.
          </p>
        ) : (
          <>
            {invoiceTemplates.map((file, i) => (
              <div key={file.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 first:border-t-0">
                <a href={"/api/files/" + file.id} className="text-[13.5px] text-brand hover:underline">
                  {file.name}
                </a>
                <span className="text-[12px] text-ink-faint">
                  {new Date(file.uploadedAt).toISOString().slice(0, 16).replace("T", " ")}
                </span>
                {i === 0 && <span className="text-[12px] font-medium text-ok">in use</span>}
              </div>
            ))}
            <div className="mt-2 border-t border-rule pt-2 text-[13px]">
              {invoiceHoles === null ? (
                <p className="text-ink-soft">The template in use could not be read as a Word file, so it cannot be checked.</p>
              ) : invoiceCheck && invoiceCheck.unknown.length === 0 && invoiceCheck.unused.length === 0 ? (
                <p className="text-ok">Every blank in it is something we fill, and it prints what a bill must say.</p>
              ) : (
                invoiceCheck && (
                  <>
                    {invoiceCheck.unknown.length > 0 && (
                      <p>Blanks nothing fills (a send will refuse): {invoiceCheck.unknown.map((h) => "{{" + h + "}}").join(", ")}.</p>
                    )}
                    {invoiceCheck.unused.length > 0 && (
                      <p className="mt-1">A bill must say, and the template never prints: {invoiceCheck.unused.map((h) => "{{" + h + "}}").join(", ")}.</p>
                    )}
                  </>
                )
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">What we keep</h2>
        {files.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {files.map((file) => (
          <div key={file.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0">
            <a href={"/api/files/" + file.id} className="text-[13.5px] text-brand hover:underline">
              {file.name}
            </a>
            <span className="text-[12px] text-ink-faint">{KIND_MEANINGS[file.kind as keyof typeof KIND_MEANINGS] ?? file.kind}</span>
            {file.subjectType && (
              <span className="text-[12px] text-ink-faint">
                {file.subjectType} {file.subjectId}
              </span>
            )}
            {file.madeFrom && <span className="text-[12px] text-ink-faint">made from a Word file</span>}
            <span className="text-[12px] text-ink-faint">{sizeInWords(file.size)}</span>
            <span className="text-[12px] text-ink-faint">{new Date(file.uploadedAt).toISOString().slice(0, 16).replace("T", " ")}</span>
            {mayKeep && canBecomePdf(file.name) && (
              <form action={makePdfOfFile} className="ml-auto">
                <input type="hidden" name="fileId" value={file.id} />
                <button className="rounded-full border border-rule px-3 py-1 text-[12px] hover:bg-paper">Make a PDF</button>
              </form>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">Where they are kept</h2>
        <p className="mt-2 text-[13.5px]">{fileStoreInWords()}</p>
        {!usingR2() && (
          <p className="mt-1 text-[12.5px] text-ink-faint">
            On the server this is R2, and a download is a link that stops working after ten minutes.
          </p>
        )}
      </section>
    </div>
  );
}
