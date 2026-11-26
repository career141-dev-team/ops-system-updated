import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { StatusChip, pillSecondary } from "@/app/ui/figma";
import { EmptyState } from "@/app/ui/figma";
import { desk, member as memberIn, switchedOn } from "@/data/desk";
import { teamsFake } from "@/lib/graphCalendar";
import { people as taPeople } from "@/lib/ta";
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
import { safeBack } from "@/lib/back";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref, sendHref } from "@/lib/sendModal";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { CheckInSendModal } from "../ClientSendModals";
import CopyButton from "../CopyButton";
import { ClientsHead, Msg, PILL_TONE, RailCard, ReachIcons, StandsCard, TILE_CYCLE, TILE_TONE } from "../parts";
import { initialsFor } from "@/app/ui/figma";
import CheckInPanel from "./CheckInPanel";
import NewClientPanel from "./NewClientPanel";

type SP = { msg?: string; q?: string; f?: string; filter?: string; all?: string; panel?: string; send?: string; on?: string; after?: string };

/** C1 · Clients, all clients (v6 frame 177:122): a card for each client, the rail on the right. */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  // Old links: the lead and agreement lists have their own pages now.
  if (sp.filter === "leads") redirect("/leads");
  if (sp.filter === "agreements") redirect("/clients/agreements");
  const { msg, q = "", f = "", all, panel, send, on, after } = sp;
  const db = await desk();
  const now = Date.now();

  const taSide = panel === "new-client" ? await taPeople() : { ok: false as const, reason: "", data: [] as { id: string; fullName: string; isActive: boolean }[] };
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
      <div className="flex items-start gap-[22px] max-pg-xl:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px] max-pg-xl:w-full">
          <div className="flex flex-wrap items-center gap-2">
            {CLIENT_FILTERS.map((x) => (
              <Link
                key={x.key}
                href={x.key === "signed" ? keep({}) : keep(f === x.key ? {} : { f: x.key })}
                aria-current={f === x.key || (!f && !q && x.key === "signed") ? "true" : undefined}
                className={"t-label rounded-full px-3.5 py-1.5 " + (f === x.key || (!f && !q && x.key === "signed") ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-2 hover:bg-shell")}
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
            <div data-stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 pg-xl:grid-cols-3">
              {visible.map((c) => (
                <article key={c.id} className="@container relative flex flex-col gap-4 rounded-[24px] bg-surface p-6 shadow-card transition-shadow hover:[box-shadow:0_0_0_1px_var(--color-card-line),var(--shadow-float)]">
                  <div className="flex items-center gap-3">
                    <span className={"flex size-11 shrink-0 items-center justify-center rounded-[14px] text-[17px] font-medium leading-[26px] " + TILE_TONE[TILE_CYCLE[cards.findIndex((x) => x.id === c.id) % TILE_CYCLE.length]]}>{c.tile}</span>
                    <Link href={c.href} className="min-w-0 flex-1 truncate text-[17px] font-medium leading-[26px] @min-[340px]:text-[19px] after:absolute after:inset-0 after:rounded-[24px]">
                      {c.name}
                    </Link>
                    {/* The owner chip gave way to a menu (owner, 24 Nov). Above the card's link, so it opens instead of following it. */}
                    <details className="relative z-10 shrink-0 open:z-30">
                      <summary aria-label={"More about " + c.name} className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink [&::-webkit-details-marker]:hidden">
                        <Icon name="more" size={18} />
                      </summary>
                      <div className="absolute right-0 top-10 z-20 flex w-36 flex-col gap-0.5 rounded-[18px] bg-surface p-2 shadow-float">
                        <Link href={c.href} className="t-small rounded-lg px-3 py-1.5 hover:bg-sunk">
                          View
                        </Link>
                        <Link href={c.href + "?view=contacts"} className="t-small rounded-lg px-3 py-1.5 hover:bg-sunk">
                          Edit
                        </Link>
                      </div>
                    </details>
                  </div>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[18px] bg-sunk text-[13px] font-medium tracking-[0.06em] text-ink-2">{initialsFor(c.person?.name)}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-medium leading-[24px] @min-[340px]:text-[17px] @min-[340px]:leading-[26px]">{c.person ? c.person.name : "No contact written down"}</span>
                      {c.person?.role && <span className="text-[13px] leading-[20px] text-ink-3 @min-[340px]:text-[15px] @min-[340px]:leading-[22px]">{c.person.role.length <= 3 ? c.person.role.toUpperCase() : c.person.role}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 @min-[340px]:gap-2">
                      <ReachIcons phone={c.person?.phone} email={c.person?.email} />
                    </span>
                  </div>
                  <div className="h-px bg-rule" />
                  {/* Two of the open positions, then a link to the rest on the client's page (Ops lead, 25 Nov). */}
                  <div className="flex flex-col gap-1.5 text-[13px] @min-[340px]:text-[15px]">
                    <div className="flex items-center justify-between gap-3 text-ink-3">
                      <span>{c.openRoles.length ? "Open positions" : "No open positions"}</span>
                      <span>
                        {c.positionsGiven} {c.positionsGiven === 1 ? "position" : "positions"} given
                      </span>
                    </div>
                    {c.openRoles.slice(0, 2).map((r) => (
                      <Link key={r.id} href={"/positions/" + r.id} className="relative z-10 truncate rounded-[10px] bg-sunk px-3 py-1.5 font-medium hover:bg-shell">
                        {r.title}
                      </Link>
                    ))}
                    {c.openRoles.length > 2 && (
                      <Link href={c.href + "#positions"} className="relative z-10 w-fit text-ink-2 underline underline-offset-2 hover:text-ink">
                        Show {c.openRoles.length - 2} more
                      </Link>
                    )}
                  </div>
                  <div className="h-px bg-rule" />
                  <div className="flex min-h-[34px] flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px] @min-[340px]:text-[15px]">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={"whitespace-nowrap rounded-full px-3 py-1.5 font-medium leading-5 @min-[340px]:px-3.5 " + (PILL_TONE[c.status.tone] ?? PILL_TONE.neutral)}>{c.status.text}</span>
                      {c.agreementNotSigned && <StatusChip label="Agreement not signed" tone="warn" />}
                    </span>
                    {c.copy ? (
                      c.copy.kind === "checkin" ? (
                        <Link href={panelHref("/clients", sp, "check-in", c.id)} scroll={false} className="relative z-10 ml-auto shrink-0 rounded-full bg-ink px-3.5 py-1.5 font-medium leading-5 text-ink-inverse @min-[340px]:px-4">
                          {c.copy.label}
                        </Link>
                      ) : (
                        <span className="relative z-10 ml-auto shrink-0">
                          <CopyButton text={c.copy.text} label={c.copy.label} className="inline-flex cursor-pointer items-center rounded-full bg-ink px-3.5 py-1.5 font-medium @min-[340px]:px-4 leading-5 text-ink-inverse" />
                        </span>
                      )
                    ) : (
                      <span className="ml-auto text-right leading-[22px] text-ink-3">{c.line}</span>
                    )}
                  </div>
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
        <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-pg-xl:w-full">
          <StandsCard head={stands.head} body={stands.body} people={stands.people.map((p) => ({ ...p, href: "/work", label: "Open work" }))} more={stands.more} />
          <RailCard title="Latest">
            {latest.length === 0 ? (
              <p className="t-small text-ink-3">Nothing has happened with a client yet.</p>
            ) : (
              latest.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="flex pt-1.5">
                    <span aria-hidden="true" className={"size-1.5 rounded-[3px] " + (/chase|draft|negotiat|changes|hold/i.test(e.action) ? "bg-warn" : "bg-info")} />
                  </span>
                  <span className="t-small w-[70px] shrink-0 text-ink-3">{agoShort(e.at, now)}</span>
                  <span className="t-small min-w-0 flex-1">{entryInWords(e)}</span>
                </div>
              ))
            )}
          </RailCard>
        </aside>
      </div>
      {panel === "new-client" && (
        <NewClientPanel
          closeHref={after ? safeBack(after, "/clients") : closeHref("/clients", sp)}
          after={safeBack(after, "") || undefined}
          msg={msg}
          mayAdd={can(me, "client.manage")}
          refusal={refusal("client.manage")}
          call={{ taPeople: taSide.ok ? taSide.data.filter((p) => p.isActive) : [], members: db.members, organiserId: me.id, teamsOn: teamsFake() || switchedOn(db, "switch.teamsEnabled") }}
        />
      )}
      {checkInCard && (
        <CheckInPanel
          card={checkInCard}
          now={now}
          close={closeHref("/clients", sp)}
          checkIn={checkInText(checkInCard.person, memberIn(db, checkInCard.ownerId)?.name ?? me.name)}
        />
      )}
      {sendCheckInCard && (
        <CheckInSendModal card={sendCheckInCard} me={me} closeHref={closeSendHref("/clients", sp)} db={db} now={now} />
      )}
    </div>
  );
}
