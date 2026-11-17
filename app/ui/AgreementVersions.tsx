import { agreementVersions } from "@/lib/esa";
import { viewHref } from "@/lib/files";

type F = { id: string; name: string; mime: string; uploadedAt: number; kind: string };

const day = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

/**
 * The agreement's versions, each with Open in a new tab (17 Nov): the drafted
 * file of every version, then the signed and countersigned copies. On the lead
 * and on the client, so both show the same list.
 */
export function AgreementVersions({
  esa,
  files,
}: {
  esa: { version: number; sentAt: number | null; signedAt: number | null; signedFileId: string | null; countersignedFileId: string | null };
  files: F[];
}) {
  const rows = agreementVersions(files);
  const copy = (id: string | null) => files.find((f) => f.id === id) ?? null;
  const signed = copy(esa.signedFileId);
  const countersigned = copy(esa.countersignedFileId);
  const link = "font-medium text-brand hover:underline";

  const line = (key: string, label: string, note: string, file: Pick<F, "id" | "name" | "mime">) => (
    <div key={key} className="flex flex-wrap items-center justify-between gap-2 border-t border-rule py-2.5 text-[14px] first:border-t-0">
      <span className="font-medium text-ink">{label}</span>
      <span className="text-ink-soft">{note}</span>
      <a href={viewHref(file)} target="_blank" rel="noopener noreferrer" className={link}>
        Open in a new tab
      </a>
    </div>
  );

  if (!rows.length && !signed && !countersigned) {
    return <p className="text-[14px] text-ink-soft">No drafted copy is kept for this agreement yet.</p>;
  }
  return (
    <div className="flex flex-col">
      {countersigned && line("cs", "Countersigned copy", "Sealed", countersigned)}
      {signed && line("sg", "Signed copy", esa.signedAt ? "Signed " + day(esa.signedAt) : "Signed", signed)}
      {rows.map((r) =>
        line(
          "v" + r.version,
          "v" + r.version,
          r.version === esa.version && esa.sentAt ? "Sent " + day(esa.sentAt) : "Draft · made " + day(r.file.uploadedAt),
          r.file,
        ),
      )}
    </div>
  );
}

/**
 * The newest drafted ESA itself, on the page (17 Nov): the owner reads the document
 * where they fill it in, not behind a link. A browser that shows PDFs inside a page
 * gets the PDF (the server's real one, or the reading copy on a laptop); one that
 * cannot (the desktop app's own preview pane) gets the same document as a web page.
 */
export function DraftDocument({ file, version }: { file: { id: string; name: string; mime: string; uploadedAt: number }; version: number }) {
  const pdf = viewHref(file);
  const isWord = pdf.endsWith("/view");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
        <span className="font-medium text-ink">
          v{version} · made {new Date(file.uploadedAt + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")}
        </span>
        <a href={pdf} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
          Open as PDF in a new tab
        </a>
      </div>
      <object data={pdf} type="application/pdf" className="h-[880px] w-full rounded-[12px] bg-white" aria-label={file.name}>
        {isWord ? (
          <iframe src={pdf + "?as=html"} title={file.name} className="h-[880px] w-full rounded-[12px] bg-white" />
        ) : (
          <p className="p-4 text-[14px] text-ink-soft">
            This browser cannot show a PDF inside the page.{" "}
            <a href={pdf} target="_blank" rel="noopener noreferrer" className="text-brand underline">
              Open it in a new tab
            </a>
            .
          </p>
        )}
      </object>
    </div>
  );
}
