import type { EsaDoc } from "@/lib/esaDocument";

/** The agreement page itself: the owner's draft, filled with this client's details (src/lib/esaDocument.ts). */
export default function EsaDocument({ doc }: { doc: EsaDoc }) {
  // The owner's Word file, as it looks: Times New Roman, justified, blue numbered headings, the logo top left,
  // the CAREER141 watermark and the copyright line at the foot. Always white paper with dark ink, in dark mode too.
  return (
    <div className="relative shrink-0 overflow-hidden bg-white p-6 text-[12px] leading-[18px] text-[#1f1f1f] [font-family:'Times_New_Roman',Times,serif]">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[50deg] select-none whitespace-nowrap text-[110px] font-bold leading-none text-[#e9ecef]">CAREER141</span>
      <div className="relative flex flex-col gap-3 text-justify">
        <div className="flex items-start justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/esa-logo.png" alt="Career Consultants" className="h-[92px] w-[89px] object-contain" />
          <span className="text-[11px] tracking-[0.08em] text-[#8a8f98]">CONFIDENTIAL</span>
        </div>
        <div className="flex flex-col text-left">
          {doc.to.map((l) => (
            <span key={l} className="[overflow-wrap:anywhere]">{l}</span>
          ))}
        </div>
        <div className="gap-x-7 [column-count:2]">
        {doc.parties.map((p, i) => (
          <p key={i} className={"mb-3 " + (p === "AND" ? "text-center" : "")}>{p}</p>
        ))}
        <p className="mb-3 text-[14px]">AGREE AS FOLLOWS</p>
        {doc.sections.map((s, n) => (
          <section key={s.title} className="mb-3 flex flex-col gap-2">
            <h4 className="mt-1 break-after-avoid text-[14px] font-bold uppercase text-[#528dd2]">{n + 1}) {s.title}</h4>
            {s.lead && <p>{s.lead}</p>}
            {s.items.map((t, i) => (
              <p key={i} className="pl-5 -indent-5 [break-inside:auto]">
                {s.lead ? String.fromCharCode(97 + i) + ")" : `${n + 1}.${i + 1}`} {t}
              </p>
            ))}
          </section>
        ))}
        </div>
        <p className="mt-2">As a token of acceptance of the above terms and conditions, both parties have set their hands by signing this document on the date and place written below;</p>
        <div className="mt-5 grid grid-cols-2 gap-10 text-left">
          <div className="flex flex-col">
            <span className="mb-1">………………………………………</span>
            <span className="font-bold">On behalf of CAREER CONSULTANTS (PVT) LIMITED</span>
            <span>{doc.signing.career}</span>
            <span>MANAGING DIRECTOR</span>
            <span>DATE:</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1">………………………………………</span>
            <span className="font-bold [overflow-wrap:anywhere]">On behalf of {doc.parties[2].split(" having")[0]}</span>
            <span>NAME: {doc.signing.client}</span>
            <span>DESIGNATION: {doc.signing.clientTitle}</span>
            <span>DATE:</span>
          </div>
        </div>
        <p className="mt-3 border-t border-[#d9dce1] pt-2 text-center text-[11px] text-[#6b7078]">Career Consultants (Private) Limited. 2020 Version 2.0. All rights reserved</p>
      </div>
    </div>
  );
}
