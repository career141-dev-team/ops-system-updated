import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import { StatusChip, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { coverNote, termRows } from "@/lib/agreementView";
import { esaDocument } from "@/lib/esaDocument";
import EsaDocument from "./EsaDocument";
import { STATE_MEANINGS as ESA_STATES, type EsaState } from "@/lib/esa";
import type { OpsEsa } from "@/data/types";

const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? (w[w.length - 1][0] ?? "") : "")).toUpperCase() || "—";
};

/**
 * The Agreement view of a client (Figma 219:302): the terms, the template and who it goes to on the left; on the
 * right the cover email and the agreement as the client receives it, with Edit and Send under them. Every value
 * is this client's own, worked out in `src/lib/agreementView.ts`.
 */
export default function AgreementView(p: {
  company: string;
  esa: OpsEsa;
  contact: { name: string; title: string } | null;
  ownerName: string;
  ownerPhone: string;
  directorName: string;
  /** "12 November" when a call was held before the agreement, else null. */
  callDate: string | null;
  callLine: string | null;
  fileName: string;
  editHref: string | null;
  /** Opens the whole document as a popup. */
  viewHref: string;
  /** The button that opens the send popup, or null when this state has none. */
  send: { href: string; label: string } | null;
  children?: ReactNode;
}) {
  const doc = esaDocument(p.esa.fields, { company: p.company, at: p.esa.updatedAt, directorName: p.directorName });
  const f = p.esa.fields;
  const contactName = f.signatoryName || p.contact?.name || "";
  const contactTitle = f.signatoryTitle || p.contact?.title || "";
  const state = ESA_STATES[p.esa.state as EsaState]?.split(".")[0] ?? p.esa.state;
  const tone = p.esa.state === "signed" || p.esa.state === "countersigned" ? "brand" : p.esa.state === "negotiating" || p.esa.state === "declined" || p.esa.state === "expired" ? "warn" : "neutral";
  const company = f.companyName || p.company;
  const card = "rounded-[18px] border border-rule-strong bg-surface shadow-[0_0_10px_rgb(15_23_31/0.1),0_2px_8px_rgb(15_23_31/0.07)]";
  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 pg-lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 rounded-[24px] bg-sunk p-5">
          <div className="flex flex-col gap-1.5">
            <p className="t-micro text-ink-3">AGREEMENT</p>
            <h2 className="text-[24px] font-medium leading-[32px] text-ink [overflow-wrap:anywhere]">{p.company}</h2>
            <p className="t-body flex flex-wrap items-center gap-2 text-ink-2">
              Version {p.esa.version}
              <StatusChip label={state} tone={tone} />
            </p>
            {p.callLine && <p className="t-small text-ink-3">{p.callLine}</p>}
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="t-micro text-ink-3">THE TERMS</p>
            <div className="flex flex-col rounded-[16px] bg-surface">
              {termRows(f).map((r) => (
                <div key={r.label} className="flex items-center gap-3 border-t border-rule px-3.5 py-3 first:border-t-0">
                  <span className="t-body w-[76px] shrink-0 text-ink-3">{r.label}</span>
                  <span className="t-body-m whitespace-nowrap text-[16px] text-ink">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="t-micro text-ink-3">TEMPLATE</p>
            <p className="t-body-m flex items-center gap-2 text-[17px] text-ink">
              <Icon name="file" size={18} />
              Standard agreement, v{p.esa.version}
            </p>
            {p.editHref && (
              <Link href={p.editHref} className="t-body text-info underline">
                change
              </Link>
            )}
          </div>
          {contactName && (
            <div className="flex flex-col gap-2.5">
              <p className="t-micro text-ink-3">TO</p>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warn-soft t-label text-warn">{initials(contactName)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m text-[17px] text-ink">{contactName}</span>
                  <span className="t-small truncate text-ink-3">{[contactTitle, company].filter(Boolean).join(", ")}</span>
                </span>
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-sunk p-5">
          <div className="grid items-start gap-5 pg-xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className={card + " flex flex-col"}>
              <div className="flex flex-col gap-3 border-b border-rule px-6 py-5">
                <p className="t-h3 text-ink [overflow-wrap:anywhere]">Career141 · Employment Services Agreement for {company}</p>
                <dl className="grid grid-cols-[48px_1fr] gap-y-1.5 text-[14px]">
                  <dt className="text-ink-3">From</dt>
                  <dd className="text-ink">{p.ownerName}, Career141</dd>
                  <dt className="text-ink-3">To</dt>
                  <dd className="text-ink">{contactName || "No contact written down"}</dd>
                  <dt className="text-ink-3">Cc</dt>
                  <dd className="text-ink">{p.directorName}</dd>
                </dl>
              </div>
              <div className="flex flex-col gap-4 px-6 py-5">
                <p className="t-body whitespace-pre-wrap text-ink">{coverNote({ contact: contactName, owner: p.ownerName, fields: f, callDate: p.callDate })}</p>
                <div className="flex flex-col">
                  <span className="t-body-m text-ink">{p.ownerName.split(/\s+/)[0]}</span>
                  <span className="t-small text-ink-3">{["Career141 Ops", p.ownerPhone].filter(Boolean).join(" · ")}</span>
                </div>
                <span className="t-small inline-flex w-fit items-center gap-2 rounded-[10px] border border-rule bg-sunk px-3.5 py-2 text-ink">
                  <Icon name="file" size={16} className="text-danger" />
                  {p.fileName}
                </span>
              </div>
            </section>

            <div className="flex min-w-0 flex-col gap-2.5">
              <p className="t-micro text-ink-3 [overflow-wrap:anywhere]">ATTACHED: {p.fileName.toUpperCase()}</p>
              <article className={card + " max-h-[720px] overflow-y-auto"}>
                <EsaDocument doc={doc} />
              </article>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link href={p.viewHref} scroll={false} className={pillSecondary + " !gap-2"}>
              <Icon name="file" size={16} />
              View
            </Link>
              {p.editHref && (
                <Link href={p.editHref} className={pillSecondary + " !gap-2"}>
                  <Icon name="pen" size={16} />
                  Edit
                </Link>
              )}
              {p.send && (
                <Link href={p.send.href} scroll={false} className={pillPrimary + " !gap-2"}>
                  <Icon name="send" size={16} />
                  {p.send.label}
                </Link>
              )}
          </div>
        </div>
      </div>
      {p.children}
    </div>
  );
}
