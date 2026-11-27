import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { EmptyState, pillSecondary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import type { AgreementColumn } from "@/lib/clientsBoard";
import { type AgreementCard, agreementCards, chaseLadder, clientTotals, clientsLine } from "@/lib/clientsView";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref } from "@/lib/sendModal";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { ChaseAgreementSendModal } from "../../ClientSendModals";
import CopyButton from "../../CopyButton";
import { ClientsHead, FlowStrip, Msg, RailCard, StandsCard, TILE_TONE, TONE_TEXT } from "../../parts";
import { AgreementDeclinedPanel, ChaseAgreementPanel } from "./AgreementPanels";

type SP = { msg?: string; q?: string; panel?: string; send?: string; on?: string };

const COLUMNS: { key: AgreementColumn; label: string; dot: string }[] = [
  { key: "send", label: "To send", dot: "bg-warn" },
  { key: "chasing", label: "Sent · chasing", dot: "bg-warn" },
  { key: "changes", label: "Changes wanted", dot: "bg-warn" },
  { key: "signed", label: "Signed · waits for the Director", dot: "bg-info" },
  { key: "done", label: "Done this month", dot: "bg-brand" },
];

/** C3 · Clients, agreements (v6 frame 136:2): each agreement moves right - send it, chase it, record the answer, countersign. */
export default async function AgreementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const { msg, q = "", panel, on } = sp;
  const db = await desk();
  const now = Date.now();
  const totals = clientTotals(db, now);
  const search = q.trim().toLowerCase();
  const all = agreementCards(db, now);
  const cards = all.filter((c) => !search || c.find.includes(search));
  const inColumn = (k: AgreementColumn, list: AgreementCard[] = cards) => list.filter((c) => c.column === k);
  const chasing = inColumn("chasing", all);
  const changes = inColumn("changes", all);
  const signed = inColumn("signed", all);
  const dueNow = chasing.filter((c) => c.copy);

  const stands = {
    head: chasing.length + (chasing.length === 1 ? " agreement is" : " agreements are") + " being chased.",
    body: [
      ...dueNow.slice(0, 1).map((c) => c.company + " is on chase " + c.copy!.step + " today."),
      ...changes.slice(0, 1).map((c) => c.company + " wants changes and waits for an answer."),
      ...signed.slice(0, 1).map((c) => c.company + " has signed and waits for the Director's signature."),
    ].join(" "),
  };
  const mayManage = can(me, "client.manage");
  const close = closeHref("/clients/agreements", sp);
  const esa = panel && on ? (db.agreements.find((a) => a.id === on) ?? null) : null;
  const card = esa ? (all.find((c) => c.id === esa.id) ?? null) : null;
  const open = all.filter((c) => c.column === "chasing" || c.column === "changes" || c.column === "send").map((c) => ({ id: c.id, company: c.company }));

  return (
    <div className="flex flex-col gap-[22px]">
      <ClientsHead
        tab="agreements"
        line={clientsLine(totals)}
        counts={totals}
        q={q}
        extra={
          <Link href={panelHref("/clients/agreements", sp, "agreement-declined")} scroll={false} className={pillSecondary + " !px-3.5 !py-2 !text-[12px]"}>
            Agreement declined or expired
          </Link>
        }
      />
      <FlowStrip
        items={[
          { label: "New", n: totals.enquiryCards.filter((c) => c.column === "new").length, dot: true, href: "/leads" },
          { label: "Call", n: totals.enquiryCards.filter((c) => c.column === "intro").length, href: "/leads" },
          { label: "Agreement to send", n: totals.enquiryCards.filter((c) => c.column === "send").length, dot: true, href: "/leads" },
          { label: "Agreements", n: totals.agreements },
          { label: "Active clients", n: totals.clients, href: "/clients" },
        ]}
      />
      <Msg msg={msg} />
      <div className="flex items-start gap-[22px] max-pg-xl:flex-col">
        <section className="flex min-w-0 flex-1 flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card max-pg-xl:w-full">
          <div className="flex flex-col gap-0.5">
            <h2 className="t-h2">Agreements</h2>
            <p className="t-small text-ink-3">Each agreement moves right: send it, chase it, record the answer, then the Director countersigns.</p>
          </div>
          {all.length === 0 ? (
            <EmptyState icon="file" title="No agreement yet">
              One appears here when an intro call is held and its agreement is drafted.
            </EmptyState>
          ) : (
            <div className="flex snap-x gap-3.5 overflow-x-auto pb-2">
              {COLUMNS.map((col) => {
                const list = inColumn(col.key);
                const shown = col.key === "done" ? list.slice(0, 2) : list;
                return (
                  <div key={col.key} className="flex w-[calc((100%-28px)/2.5)] min-w-[220px] shrink-0 snap-start flex-col gap-2.5 self-start rounded-[20px] bg-sunk px-3 py-3.5">
                    <div className="flex items-center gap-2 px-1 pb-0.5">
                      <span aria-hidden="true" className={"size-2 rounded-[4px] " + col.dot} />
                      <h3 className="t-body-m flex-1">{col.label}</h3>
                      <span className="t-small text-ink-3">{list.length}</span>
                    </div>
                    {shown.map((c) => {
                      const toLead = "/leads/" + c.leadId + "?step=agreement";
                      const pill = "t-label inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] hover:bg-sunk";
                      const rowEsa = db.agreements.find((a) => a.id === c.id);
                      const docFile = rowEsa
                        ? (rowEsa.countersignedFileId ? db.files.find((f) => f.id === rowEsa.countersignedFileId) : null) ??
                          (rowEsa.signedFileId ? db.files.find((f) => f.id === rowEsa.signedFileId) : null) ??
                          (rowEsa.draftFileId ? db.files.find((f) => f.id === rowEsa.draftFileId) : null) ??
                          db.files.filter((f) => f.subjectType === "esa" && f.subjectId === rowEsa.id).at(-1) ??
                          null
                        : null;
                      return (
                        <article key={c.id} className="flex flex-col gap-2 rounded-[16px] bg-surface p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={"t-label flex size-8 shrink-0 items-center justify-center rounded-full " + TILE_TONE[col.key === "done" ? "neutral" : col.key === "signed" ? "info" : col.key === "chasing" && /^Next chase/.test(c.state.text) ? "neutral" : "warn"]}>{c.tile}</span>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <Link href={col.key === "chasing" ? panelHref("/clients/agreements", sp, "chase-agreement", c.id) : toLead} scroll={col.key !== "chasing" ? undefined : false} className="t-body-m hover:underline">
                                {c.company}
                              </Link>
                              <span className="t-small text-ink-3">{c.line}</span>
                            </div>
                            <Link href={"/leads/" + c.leadId} aria-label={"Open " + c.company} className="flex size-7 shrink-0 items-center justify-center rounded-[14px] text-ink-3 hover:bg-sunk">
                              <Icon name="more" size={14} />
                            </Link>
                          </div>
                          <p className={"t-small " + TONE_TEXT[c.state.tone]}>{c.state.text}</p>
                          {c.extra && <p className="t-small text-ink-3">{c.extra}</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {col.key === "send" && (
                              <Link href={panelHref("/leads", {}, "send-agreement", c.leadId)} className={pill}>
                                <Icon name="mail" size={14} />
                                Send the agreement
                              </Link>
                            )}
                            {col.key === "chasing" &&
                              (c.copy ? (
                                <CopyButton text={c.copy.text} label={c.copy.label} tone="pill" />
                              ) : (
                                <Link href={toLead} className={pill}>
                                  <Icon name="check" size={14} />
                                  Signed back
                                </Link>
                              ))}
                            {col.key === "changes" && (
                              <Link href={toLead} className={pill}>
                                <Icon name="user" size={14} />
                                Record his answer
                              </Link>
                            )}
                            {col.key === "signed" && (
                              <Link href={toLead} className={pill}>
                                <Icon name="check" size={14} />
                                Countersigned
                              </Link>
                            )}
                            {docFile && (
                              <a href={`/api/files/${docFile.id}/view`} target="_blank" rel="noreferrer" className={pill}>
                                <Icon name="file" size={14} />
                                View ESA
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {col.key === "done" && list.length > shown.length && <p className="t-small px-1 text-ink-3">{list.length - shown.length} more</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-pg-xl:w-full">
          <StandsCard
            head={stands.head}
            body={stands.body}
            copies={dueNow.slice(0, 1).map((c) => ({ label: c.copy!.label, text: c.copy!.text }))}
            links={changes[0] ? [{ label: "Record his answer", href: "/leads/" + changes[0].leadId + "?step=agreement" }] : []}
          />
          <RailCard title="How the chase goes">
            <ol className="flex flex-col gap-2.5">
              {chaseLadder().map((s) => (
                <li key={s.n} className="t-small flex gap-3">
                  <span className="w-3 shrink-0 text-ink-3">{s.n}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </RailCard>
        </aside>
      </div>
      {panel === "chase-agreement" && esa && card && <ChaseAgreementPanel db={db} esa={esa} card={card} now={now} close={close} mayManage={mayManage} />}
      {panel === "agreement-declined" && <AgreementDeclinedPanel db={db} esa={esa} card={card} close={close} mayManage={mayManage} open={open} />}
      {sp.send === "chase-agreement" && on && (() => {
        const sc = all.find((c) => c.id === on);
        return sc ? <ChaseAgreementSendModal db={db} card={sc} me={me} closeHref={closeSendHref("/clients/agreements", sp)} /> : null;
      })()}
    </div>
  );
}
