import Link from "next/link";
import { redirect } from "next/navigation";

import { pillSecondary } from "@/app/ui/figma";
import { EmptyState } from "@/app/ui/figma";
import { desk, member as memberIn } from "@/data/desk";
import { agoShort } from "@/lib/clientCards";
import {
  CLIENT_FILTERS,
  checkInText,
  clientCards,
  clientTotals,
  clientsLine,
  filterCards,
  standsClients,
} from "@/lib/clientsView";
import { entryInWords, gather } from "@/lib/timeline";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref, sendHref } from "@/lib/sendModal";
import { currentMember } from "@/lib/session";
import { CheckInSendModal } from "../ClientSendModals";
import CopyButton from "../CopyButton";
import { ClientsHead, Msg, RailCard, ReachIcons, StandsCard, TILE_TONE, TONE_DOT, TONE_TEXT } from "../parts";
import CheckInPanel from "./CheckInPanel";

type SP = { msg?: string; q?: string; f?: string; filter?: string; all?: string; panel?: string; send?: string; on?: string };

/** C1 · Clients, all clients (v6 frame 177:122): a card for each client, the rail on the right. */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  // Old links: the lead and agreement lists have their own pages now.
  if (sp.filter === "leads") redirect("/leads");
  if (sp.filter === "agreements") redirect("/clients/agreements");
  const { msg, q = "", f = "", all, panel, send, on } = sp;
  const db = await desk();
  const now = Date.now();

  const cards = clientCards(db, now);
  const shown = filterCards(cards, f, q, me.id);
  const visible = all ? shown : shown.slice(0, 9);
  const totals = clientTotals(db, now);
  const stands = standsClients(cards);

  // The latest word on any client, lead or agreement: the audit trail in the desk's own sentences.
  const ids = new Set<string>([...db.clients.map((c) => c.id), ...db.leads.map((l) => l.id), ...db.agreements.map((a) => a.id)]);
  const latest = gather(db, ids)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return "/clients" + (s ? "?" + s : "");
  };
  const checkInCard = panel === "check-in" && on ? (cards.find((c) => c.id === on) ?? null) : null;
  const sendCheckInCard = send === "check-in" && on ? (cards.find((c) => c.id === on) ?? null) : null;

  return (
    <div className="flex flex-col gap-[22px]">
      <ClientsHead tab="clients" line={clientsLine(totals)} counts={totals} q={q} filter={f} />
      <Msg msg={msg} />
      <div className="flex items-start gap-[22px] max-xl:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px] max-xl:w-full">
          <div className="flex flex-wrap items-center gap-2">
            {CLIENT_FILTERS.map((x) => (
              <Link
                key={x.key}
                href={keep(f === x.key ? {} : { f: x.key })}
                aria-current={f === x.key ? "true" : undefined}
                className={"t-label rounded-full px-3.5 py-1.5 " + (f === x.key ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-2 hover:bg-shell")}
              >
                {x.label}
              </Link>
            ))}
          </div>
          {visible.length === 0 ? (
            <EmptyState icon="clients" title={cards.length === 0 ? "No clients yet" : "Nobody matches"}>
              {cards.length === 0 ? "A client appears here when an enquiry becomes a company we work for." : "Try another filter, or clear the search."}
            </EmptyState>
          ) : (
            <div data-stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((c) => (
                <article key={c.id} className="relative flex min-h-[239px] flex-col gap-4 rounded-[24px] bg-surface p-6 shadow-card transition-shadow hover:shadow-float">
                  <div className="flex items-center gap-3">
                    <span className={"t-micro flex size-10 shrink-0 items-center justify-center rounded-[12px] " + TILE_TONE[c.tileTone]}>{c.tile}</span>
                    <Link href={c.href} className="t-body-m min-w-0 flex-1 after:absolute after:inset-0 after:rounded-[24px]">
                      {c.name}
                    </Link>
                    <span className="t-small shrink-0 text-ink-3">{c.owner}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <p className="t-small min-w-0 flex-1">{c.person ? [c.person.name, c.person.role ? c.person.role.toUpperCase() : ""].filter(Boolean).join(" · ") : "No contact written down"}</p>
                    <ReachIcons phone={c.person?.phone} email={c.person?.email} />
                  </div>
                  <p className={"t-small flex items-center gap-2 " + TONE_TEXT[c.status.tone]}>
                    <span aria-hidden="true" className={"size-[7px] shrink-0 rounded-[4px] " + TONE_DOT[c.status.tone]} />
                    {c.status.text}
                  </p>
                  <p className="t-small text-ink-3">{c.line}</p>
                  <div className="flex-1" />
                  {c.copy &&
                    (c.copy.kind === "checkin" ? (
                      <Link href={panelHref("/clients", sp, "check-in", c.id)} scroll={false} className="t-label relative z-10 w-fit text-brand hover:underline">
                        {c.copy.label} →
                      </Link>
                    ) : (
                      <span className="relative z-10 w-fit">
                        <CopyButton text={c.copy.text} label={c.copy.label} />
                      </span>
                    ))}
                </article>
              ))}
            </div>
          )}
          {!all && shown.length > visible.length && (
            <div className="flex justify-center">
              <Link href={keep({ f, all: "1" })} className={pillSecondary + " !px-3 !py-[7px] !text-[12px]"}>
                Show all {shown.length}
              </Link>
            </div>
          )}
        </div>
        <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-xl:w-full">
          <StandsCard head={stands.head} body={stands.body} copies={stands.copies} />
          <RailCard title="Latest">
            {latest.length === 0 ? (
              <p className="t-small text-ink-3">Nothing has happened with a client yet.</p>
            ) : (
              latest.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="flex pt-1.5">
                    <span aria-hidden="true" className="size-1.5 rounded-[3px] bg-brand" />
                  </span>
                  <span className="t-small w-[70px] shrink-0 text-ink-3">{agoShort(e.at, now)}</span>
                  <span className="t-small min-w-0 flex-1">{entryInWords(e)}</span>
                </div>
              ))
            )}
          </RailCard>
        </aside>
      </div>
      {checkInCard && (
        <CheckInPanel
          card={checkInCard}
          now={now}
          close={closeHref("/clients", sp)}
          checkIn={checkInText(checkInCard.person, memberIn(db, checkInCard.ownerId)?.name ?? me.name)}
        />
      )}
      {sendCheckInCard && (
        <CheckInSendModal card={sendCheckInCard} me={me} closeHref={closeSendHref("/clients", sp)} />
      )}
    </div>
  );
}
