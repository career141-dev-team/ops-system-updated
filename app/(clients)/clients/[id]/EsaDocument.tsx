import type { EsaDoc } from "@/lib/esaDocument";

/** The agreement page itself: the owner's draft, filled with this client's details (src/lib/esaDocument.ts). */
export default function EsaDocument({ doc, at }: { doc: EsaDoc; at: string }) {
  return (
    <div className="flex flex-col gap-4 text-[14px] leading-[22px] text-ink">
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/career141-lockup.png" alt="career141 · 20 years" className="h-10 w-[126px] object-contain" />
        <span className="t-micro text-ink-3">CONFIDENTIAL</span>
      </div>
      <div className="flex flex-col text-ink-2">
        {doc.to.map((l) => (
          <span key={l} className="[overflow-wrap:anywhere]">{l}</span>
        ))}
        <span className="mt-1 text-ink-3">{at}</span>
      </div>
      {doc.parties.map((p, i) => (
        <p key={i} className={p === "AND" ? "font-medium" : ""}>{p}</p>
      ))}
      <p className="font-medium">AGREE AS FOLLOWS</p>
      {doc.sections.map((s, n) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h4 className="mt-1 text-[15px] font-medium">{n + 1}. {s.title}</h4>
          {s.lead && <p>{s.lead}</p>}
          {s.items.map((t, i) => (
            <p key={i} className="flex gap-3">
              <span className="w-9 shrink-0 text-ink-3">{s.lead ? String.fromCharCode(97 + i) + ")" : `${n + 1}.${i + 1}`}</span>
              <span className="min-w-0 flex-1">{t}</span>
            </p>
          ))}
        </section>
      ))}
      <p className="mt-2">As a token of acceptance of the above terms and conditions, both parties have set their hands by signing this document on the date and place written below;</p>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-1 border-t border-ink pt-2">
          <span className="font-medium">On behalf of CAREER CONSULTANTS (PVT) LIMITED</span>
          <span className="t-micro text-ink-3">{doc.signing.career}, Managing Director · Date:</span>
        </div>
        <div className="flex flex-col gap-1 border-t border-ink pt-2">
          <span className="font-medium [overflow-wrap:anywhere]">On behalf of {doc.parties[2].split(" having")[0]}</span>
          <span className="t-micro text-ink-3">{[doc.signing.client, doc.signing.clientTitle].filter(Boolean).join(", ")} · Date:</span>
        </div>
      </div>
      <p className="t-micro text-ink-3">Career Consultants (Private) Limited. 2020 Version 2.0. All rights reserved.</p>
    </div>
  );
}
