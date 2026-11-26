import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { EmptyState } from "@/app/ui/figma";
import { agreementForLead, desk, meetingsForLead, numberOf, switchedOn } from "@/data/desk";
import { calendarItems } from "@/lib/calendarBoard";
import {
  type EnquiryCard,
  clientTotals,
  clientsLine,
  clockWords,
  dayWords,
  weekStrip,
} from "@/lib/clientsView";
import type { EnquiryColumn } from "@/lib/clientsBoard";
import { startingFields } from "@/lib/esa";
import { currentTemplate } from "@/lib/files";
import { teamsFake } from "@/lib/graphCalendar";
import { REFUND_PCT } from "@/lib/guarantee";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref } from "@/lib/sendModal";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { people as taPeople } from "@/lib/ta";
import { SendAgreementModal } from "../ClientSendModals";
import { ClientsHead, FlowStrip, Msg, RailCard, StandsCard, TILE_TONE, TONE_TEXT } from "../parts";
import { CheckEnquiryPanel, DuplicatePanel, IntroCallPanel, SendAgreementPanel } from "./EnquiryPanels";

type SP = { msg?: string; q?: string; panel?: string; send?: string; on?: string };

const COLUMNS: { key: EnquiryColumn; label: string; dot: string }[] = [
  { key: "new", label: "New", dot: "bg-warn" },
  { key: "intro", label: "Call", dot: "bg-info" },
  { key: "send", label: "Agreement to send", dot: "bg-brand" },
];

/** C2 · Clients, enquiries (v6 frame 134:2): each enquiry moves right as it is checked, the call is held and the agreement goes. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const { msg, q = "", panel, on } = sp;
  const db = await desk();
  const now = Date.now();
  const totals = clientTotals(db, now);
  const search = q.trim().toLowerCase();
  const cards = totals.enquiryCards.filter((c) => !search || [c.company, c.contact?.name, c.contact?.email].some((v) => (v ?? "").toLowerCase().includes(search)));
  const byColumn = (k: EnquiryColumn) => cards.filter((c) => c.column === k);
  const all = totals.enquiryCards;
  const count = (k: EnquiryColumn) => all.filter((c) => c.column === k).length;

  // Closed this month: the enquiries that ended without an agreement, by name.
  const monthAgo = now - 30 * 86_400_000;
  const closed = db.leads.filter((l) => (l.state.startsWith("closed") || l.state === "declined_industry") && l.updatedAt > monthAgo);

  // The week: calendar items (client meetings, interviews, joining days) plus unbooked intro calls.
  const booked = db.meetings.filter((m) => m.kind === "intro" && m.state === "booked");
  const week = weekStrip(booked, now);
  const weekEnd = now + 7 * 86_400_000;
  const slots = booked.filter((m) => m.at >= now - 3_600_000 && m.at < weekEnd).sort((a, b) => a.at - b.at);
  const weekEvents = calendarItems(db)
    .filter((ev) => ev.when !== null && ev.when >= now - 3_600_000 && ev.when < weekEnd)
    .sort((a, b) => (a.when as number) - (b.when as number));
  const unbooked = all.filter((c) => c.column === "intro" && !c.meeting);
  const toCheck = all.filter((c) => c.column === "new" && c.flags.length > 0);
  const stands = {
    head: slots.length + (slots.length === 1 ? " intro call" : " intro calls") + " this week.",
    body: [
      ...slots.slice(0, 1).map((m) => (db.leads.find((l) => l.id === m.leadId)?.company ?? "A lead") + " is booked for " + dayWords(m.at) + " " + clockWords(m.at) + "."),
      ...unbooked.slice(0, 1).map((c) => c.company + " still needs a time."),
      ...toCheck.slice(0, 1).map((c) => (c.match ? c.company + " may already be a client." : c.company + " is waiting for its checks.")),
    ].join(" "),
  };
  const stand = (c: EnquiryCard, panelName: string, label: string) => ({ label, href: panelHref("/leads", sp, panelName, c.id) });
  const links = [unbooked[0] && stand(unbooked[0], "intro-call", "Book " + unbooked[0].company), toCheck[0] && stand(toCheck[0], "check-enquiry", "Check " + toCheck[0].company)].filter((x): x is { label: string; href: string } => !!x);

  const mayManage = can(me, "client.manage");
  const close = closeHref("/leads", sp);
  const lead = panel && on ? (db.leads.find((l) => l.id === on) ?? null) : null;
  const card = lead ? (all.find((c) => c.id === lead.id) ?? null) : null;
  const esa = lead ? agreementForLead(db, lead.id) : null;
  const startFields = lead
    ? startingFields(
        {
          guaranteeDays: numberOf(db, "guarantee.days", 90),
          paymentDays: numberOf(db, "invoice.dueDays", 30),
          replacementWorkingDays: numberOf(db, "replacement.workingDays", 60),
          refundPct: numberOf(db, "refund.pct", REFUND_PCT),
        },
        lead,
      )
    : {};
  const ta = panel === "intro-call" ? await taPeople() : null;

  return (
    <div className="flex flex-col gap-[22px]">
      <ClientsHead tab="enquiries" line={clientsLine(totals)} counts={totals} q={q} />
      <FlowStrip
        items={[
          { label: "New", n: count("new"), dot: true },
          { label: "Call", n: count("intro") },
          { label: "Agreement to send", n: count("send"), dot: true },
          { label: "Agreements", n: totals.agreements, href: "/clients/agreements" },
          { label: "Active clients", n: totals.clients, href: "/clients" },
        ]}
      />
      <Msg msg={msg} />
      <div className="flex items-start gap-[22px] max-pg-xl:flex-col">
        <section className="flex min-w-0 flex-1 flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card max-pg-xl:w-full">
          <div className="flex flex-col gap-0.5">
            <h2 className="t-h2">Enquiries</h2>
            <p className="t-small text-ink-3">Each enquiry moves right as you check it, hold the call and send the agreement.</p>
          </div>
          {all.length === 0 ? (
            <EmptyState icon="inbox" title="No open enquiries">
              An enquiry appears here when the website form, a call or the Add button brings one in.
            </EmptyState>
          ) : (
            <div data-stagger className="flex snap-x gap-3.5 overflow-x-auto pb-2">
              {COLUMNS.map((col) => (
                <div key={col.key} className="flex w-[calc((100%-28px)/2.5)] min-w-[220px] shrink-0 snap-start flex-col gap-2.5 self-start rounded-[20px] bg-sunk px-3 py-3.5">
                  <div className="flex items-center gap-2 px-1 pb-0.5">
                    <span aria-hidden="true" className={"size-2 rounded-[4px] " + col.dot} />
                    <h3 className="t-body-m flex-1">{col.label}</h3>
                    <span className="t-small text-ink-3">{byColumn(col.key).length}</span>
                  </div>
                  {byColumn(col.key).map((c) => {
                    const action =
                      col.key === "intro"
                        ? c.meeting
                          ? { name: "intro-call", label: "Held", icon: "check" as const }
                          : { name: "intro-call", label: "Book the call", icon: "check" as const }
                        : col.key === "send"
                          ? { name: "send-agreement", label: "Send the agreement", icon: "mail" as const }
                          : { name: "check-enquiry", label: "Check", icon: "check" as const };
                    return (
                      <article key={c.id} className="flex flex-col gap-2 rounded-[16px] bg-surface p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={"t-label flex size-8 shrink-0 items-center justify-center rounded-full " + TILE_TONE[c.tileTone]}>{c.tile}</span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <Link href={c.href} className="t-body-m hover:underline">
                              {c.company}
                            </Link>
                            <span className="t-small text-ink-3">{c.line}</span>
                          </div>
                          <Link href={c.href} aria-label={"Open " + c.company} className="flex size-7 shrink-0 items-center justify-center rounded-[14px] text-ink-3 hover:bg-sunk">
                            <Icon name="more" size={14} />
                          </Link>
                        </div>
                        <p className={"t-small " + TONE_TEXT[c.state.tone]}>{c.state.text}</p>
                        {c.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {c.flags.map((f) => (
                              <Link key={f.panel} href={panelHref("/leads", sp, f.panel, c.id)} scroll={false} className="t-micro rounded-full bg-sunk px-2.5 py-1 text-warn hover:underline">
                                {f.text}
                              </Link>
                            ))}
                          </div>
                        )}
                        {c.note && col.key === "new" && <p className="t-small text-ink-3">{c.note}</p>}
                        <div>
                          <Link href={panelHref("/leads", sp, action.name, c.id)} scroll={false} className="t-label inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] hover:bg-sunk">
                            <Icon name={action.icon} size={14} />
                            {action.label}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <p className="t-small text-ink-3">{closed.length ? "Closed this month: " + closed.map((l) => l.company).join(", ") + "." : "Nothing has closed this month."}</p>
        </section>
        <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-pg-xl:w-full">
          <StandsCard head={stands.head} body={stands.body} links={links} />
          <RailCard title="This week">
            <div className="flex gap-1.5">
              {week.map((d) => (
                <div key={d.day} className={"flex w-[47px] flex-col items-center gap-0.5 rounded-[12px] py-2 " + (d.today ? "bg-bg-brand" : "border border-rule")}>
                  <span className="t-micro text-ink-3">{d.label}</span>
                  <span className={"t-body-m " + (d.today ? "text-brand" : "")}>{d.day}</span>
                  {(d.today || d.calls > 0) && <span aria-hidden="true" className="size-[5px] rounded-[3px] bg-brand" />}
                </div>
              ))}
            </div>
            {weekEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 rounded-[12px] bg-info-soft px-3 py-2.5">
                <span aria-hidden="true" className="w-[3px] self-stretch rounded-[2px] bg-info" />
                <span className="t-small w-[72px] shrink-0 text-info">
                  {dayWords(ev.when!).split(" ")[0]} {clockWords(ev.when!)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={ev.href} className="t-body-m truncate hover:underline">
                    {ev.title}
                  </Link>
                  <span className="t-small text-ink-3">{ev.sub}</span>
                </div>
              </div>
            ))}
            {unbooked.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-[12px] bg-warn-soft px-3 py-2.5">
                <span aria-hidden="true" className="w-[3px] self-stretch rounded-[2px] bg-warn" />
                <span className="t-small w-[72px] shrink-0 text-warn">Not booked</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={panelHref("/leads", sp, "intro-call", c.id)} scroll={false} className="t-body-m truncate hover:underline">
                    {c.company}
                  </Link>
                  <span className="t-small text-ink-3">Intro call, no time yet</span>
                </div>
              </div>
            ))}
            {weekEvents.length === 0 && unbooked.length === 0 && <p className="t-small text-ink-3">Nothing is on the calendar this week.</p>}
          </RailCard>
        </aside>
      </div>
      {lead && panel === "check-enquiry" && card && <CheckEnquiryPanel lead={lead} card={card} close={close} mayManage={mayManage} />}
      {lead && panel === "duplicate-check" && <DuplicatePanel lead={lead} card={card} close={close} mayManage={mayManage} />}
      {lead && panel === "intro-call" && (
        <IntroCallPanel
          lead={lead}
          meetings={meetingsForLead(db, lead.id)}
          esa={esa}
          close={close}
          mayManage={mayManage}
          members={db.members}
          taPeople={ta && ta.ok ? ta.data.filter((p) => p.isActive) : []}
          teamsOn={teamsFake() || switchedOn(db, "switch.teamsEnabled")}
          startFields={startFields}
        />
      )}
      {lead && panel === "send-agreement" && (
        <SendAgreementPanel lead={lead} esa={esa} db={db} close={close} mayManage={mayManage} startFields={startFields} esaTemplate={!!currentTemplate(db.files, "esa_draft")} />
      )}
      {sp.send === "send-agreement" && on && (
        <SendAgreementModal db={db} leadId={on} me={me} closeHref={closeSendHref("/leads", sp)} />
      )}
    </div>
  );
}
