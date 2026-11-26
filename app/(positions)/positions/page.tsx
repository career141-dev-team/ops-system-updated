import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Card, EmptyState, PageTitle, pillPrimary, pillSecondary } from "@/app/ui/figma";
import {
  agreementForLead,
  clientIn,
  desk,
  member as memberIn,
  numberOf,
  positionsNewestFirst,
  reportsNewestFirst,
  runClocks,
} from "@/data/desk";
import { agreementNotSigned } from "@/lib/clients";
import { contactsFor } from "@/lib/contacts";
import { colomboIsoWeek } from "@/lib/weekNumber";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref } from "@/lib/sendModal";
import {
  STEPS,
  dayMonth,
  dayTime,
  filterRows,
  groupByClient,
  listView,
  type ListFilter,
  type RoleRow,
  type StepKey,
} from "@/lib/positionsList";
import { recipientsFrom } from "@/lib/reports";
import { currentMember } from "@/lib/session";
import { people as taPeople } from "@/lib/ta";

import { AskTaPanel, ChaseHrPanel, ChooseTaPanel, WeeklyReportPanel, NewPositionPanel } from "./Panels";
import { PositionSendModal } from "./PositionSendModals";

export const dynamic = "force-dynamic";

type Sp = { msg?: string; q?: string; filter?: string; panel?: string; send?: string; on?: string; all?: string };

const FILTERS: { key: ListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Mine" },
  { key: "needs", label: "Needs you" },
  { key: "hold", label: "On hold" },
];
const SHOWN_CLIENTS = 8;
const DAY = 86_400_000;
const COLOMBO = 5.5 * 3_600_000;

const BAR: Record<string, string> = { danger: "bg-danger", warn: "bg-warn", info: "bg-info", ok: "bg-success", quiet: "bg-ink-faint" };

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export default async function PositionsPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as ListFilter;
  const q = sp.q ?? "";

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const ta = await taPeople();
  const taList = ta.ok ? ta.data.filter((p) => p.isActive) : [];
  const taName = (id: string) => taList.find((p) => p.id === id)?.fullName ?? null;

  const positions = positionsNewestFirst(db);
  const byId = new Map(positions.map((p) => [p.id, p]));
  const esaOf = (positionId: string) => {
    const p = byId.get(positionId);
    const leadId = p?.requirementId ? (db.requirements.find((r) => r.id === p.requirementId)?.leadId ?? null) : null;
    return leadId ? agreementForLead(db, leadId) : null;
  };
  // 26 Nov: the client's own first lead counts too, so a position TA opened with no requirement linked is not
  // flagged as unsigned when the client has signed.
  const unsigned = (positionId: string) => {
    const p = byId.get(positionId);
    const clientLeadId = p?.clientId ? (clientIn(db, p.clientId)?.leadId ?? null) : null;
    const esas = [esaOf(positionId), clientLeadId ? agreementForLead(db, clientLeadId) : null];
    return agreementNotSigned(esas.filter((e) => e !== null));
  };
  const contactsOf = (positionId: string) => {
    const p = byId.get(positionId);
    const client = p?.clientId ? clientIn(db, p.clientId) : null;
    const rows = contactsFor({ position: p?.contacts, client: client?.contacts });
    return rows.find((c) => c.role === "hr") ?? rows[0] ?? null;
  };
  const clientNameOf = (positionId: string) => {
    const p = byId.get(positionId)!;
    return (p.clientId ? clientIn(db, p.clientId)?.name : null) ?? (p.clientTaId || "Client");
  };

  const view = listView({
    now,
    chaseDays: numberOf(db, "feedback.chaseDays", 1),
    positions,
    sets: db.clientSets,
    interviews: db.interviews,
    placements: db.placements,
    holds: db.holds.filter((h) => h.state !== "lifted").map((h) => h.openingTaId),
    clientNameOf: (p) => clientNameOf(p.id),
    contactFirstNameOf: (p) => {
      const c = contactsOf(p.id);
      return c?.name ? first(c.name) : null;
    },
    taFirstNameOf: (id) => {
      const n = taName(id);
      return n ? first(n) : null;
    },
    agreementPendingOf: (p) => unsigned(p.id),
  });

  const shown = filterRows(view.rows, filter, q, me.id);
  const groups = groupByClient(shown, true);
  const visible = sp.all ? groups : groups.slice(0, SHOWN_CLIENTS);
  const openRows = view.rows.filter((r) => !r.closed);
  const mine = openRows.filter((r) => r.ownerId === me.id).length;
  const week = colomboIsoWeek(now);

  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string> = { filter, q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "filter" && v === "all")) p.set(k, v);
    const text = p.toString();
    return "/positions" + (text ? "?" + text : "");
  };

  const actionHref = (row: RoleRow) => {
    const a = row.action;
    if (!a) return "";
    if (a.kind === "call") return `/?panel=call-client&on=${row.id}`;
    if (a.kind === "find-a-time") return `/positions/${row.id}?view=interviews&panel=find-a-time&on=${a.on}`;
    if (a.kind === "chase-agreement") {
      const esa = esaOf(row.id);
      return esa ? `/clients/agreements?panel=chase-agreement&on=${esa.id}` : `/positions/${row.id}?view=requirement`;
    }
    const name = a.kind === "choose-ta" ? "choose-ta" : a.kind === "chase-hr" ? "chase-hr" : "ask-ta-cvs";
    return panelHref("/positions", sp, name, row.id);
  };

  /* The week: the booked interviews and joining days, as they stand. */
  const monday = (() => {
    const d = new Date(now + COLOMBO);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) - COLOMBO;
  })();
  const nameOfOpening = (openingTaId: string) => {
    const p = positions.find((x) => x.openingTaId === openingTaId);
    return p ? { title: p.title, client: clientNameOf(p.id), id: p.id } : null;
  };
  const events = [
    ...db.interviews
      .filter((iv) => ["booked", "agreed", "reconfirmed"].includes(iv.state) && iv.at && iv.at >= now - DAY && iv.at < now + 14 * DAY)
      .map((iv) => {
        const o = nameOfOpening(iv.openingTaId);
        return { at: iv.at!, tone: "info", when: dayTime(iv.at!), title: `${iv.candidateName} · round ${iv.round}`, sub: o ? `${o.client} · ${o.title}` : "", href: o ? `/positions/${o.id}?view=interviews` : "/positions" };
      }),
    ...db.placements
      .filter((pl) => pl.state === "placed" && !pl.joinedAt && pl.joinDate && pl.joinDate >= now - DAY && pl.joinDate < now + 30 * DAY)
      .map((pl) => {
        const o = nameOfOpening(pl.openingTaId);
        return { at: pl.joinDate!, tone: "ok", when: dayMonth(pl.joinDate!), title: `${pl.candidateName} joins`, sub: o ? `${o.client} · ${o.title}` : "", href: o ? `/positions/${o.id}?view=offer` : "/positions" };
      }),
  ].sort((a, b) => a.at - b.at);
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const start = monday + i * DAY;
    const d = new Date(start + COLOMBO);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
      num: d.getUTCDate(),
      today: now >= start && now < start + DAY,
      has: events.some((e) => e.at >= start && e.at < start + DAY),
    };
  });

  const urgent = shown.find((r) => r.tone === "danger" && r.action) ?? openRows.find((r) => r.action) ?? null;

  /* The panel that is open, if any. */
  const here = closeHref("/positions", sp);
  const panelRow = sp.on ? view.rows.find((r) => r.id === sp.on) : undefined;
  const nextOf = (kind: string, panel: string) => {
    const list = view.rows.filter((r) => r.action?.kind === kind);
    const n = list[list.findIndex((r) => r.id === panelRow?.id) + 1];
    return n ? panelHref("/positions", sp, panel, n.id) : null;
  };
  const rolesOf = (id: string) => openRows.filter((r) => byId.get(r.id)?.primaryTaId === id).length;

  let panel = null;
  if (sp.panel === "new-position") {
    // The latest held call of the picked client, for the brief, the role and the package.
    const picked = sp.on ? clientIn(db, sp.on) : null;
    const held = picked?.leadId ? db.meetings.filter((m) => m.leadId === picked.leadId && m.heldAt !== null).sort((a, b) => (b.heldAt ?? 0) - (a.heldAt ?? 0))[0] : undefined;
    panel = (
      <NewPositionPanel
        closeHref={here}
        clients={db.clients.filter((c) => c.stage !== "closed").map((c) => ({ id: c.id, name: c.name }))}
        pickedId={picked?.id ?? ""}
        call={held ? { id: held.id, when: new Date(held.heldAt! + 5.5 * 3_600_000).toISOString().slice(0, 10), role: held.role, packageSaid: held.packageSaid, brief: held.brief } : null}
      />
    );
  } else if (sp.panel === "weekly-report") {
    const latest = reportsNewestFirst(db)[0] ?? null;
    panel = (
      <WeeklyReportPanel
        closeHref={here}
        built={latest ? `Last built for the week of ${latest.weekOf}` : "No report has been built yet"}
        counts={`${openRows.length} open roles: with the client ${view.withClient}, needing you ${view.needsYou}, on hold ${view.onHold}`}
        recipients={recipientsFrom(db.settings.find((s) => s.key === "report.recipients")?.value)}
        latest={latest ? { id: latest.id, weekOf: latest.weekOf, state: latest.state } : null}
      />
    );
  } else if (panelRow && sp.panel === "choose-ta") {
    const pos = byId.get(panelRow.id)!;
    const counts = taList.map((t) => ({ id: t.id, name: t.fullName, roles: rolesOf(t.id) }));
    const fewest = counts.length ? Math.min(...counts.map((c) => c.roles)) : 0;
    panel = (
      <ChooseTaPanel
        closeHref={here}
        nextHref={nextOf("choose-ta", "choose-ta")}
        sub={`${panelRow.clientName} > ${panelRow.title}`}
        positionId={pos.id}
        why={[
          pos.primaryTaId ? "The role has a TA, and you can change who it is" : "The role has no TA yet",
          "The client cannot get CVs until a TA is chosen",
          ...(unsigned(pos.id) ? ["The agreement is not signed yet"] : []),
        ]}
        tas={counts.map((c) => ({ ...c, fewest: c.roles === fewest }))}
        currentPrimaryId={pos.primaryTaId}
        hundredPercentDay={pos.hundredPercentDay}
        msg={sp.msg}
      />
    );
  } else if (panelRow && sp.panel === "chase-hr") {
    const c = contactsOf(panelRow.id);
    const joining = db.placements.find((pl) => pl.positionId === panelRow.id && pl.state === "placed" && !pl.joinedAt && pl.joinDate && pl.joinDate < now);
    panel = (
      <ChaseHrPanel
        positionId={panelRow.id}
        closeHref={here}
        nextHref={nextOf("chase-hr", "chase-hr")}
        sendHref={"/positions?send=chase-hr&on=" + panelRow.id}
        title={`Chase ${panelRow.clientName} HR`}
        sub={`${panelRow.clientName} > ${panelRow.title}`}
        why={joining ? [`${joining.candidateName} was due to join on ${dayMonth(joining.joinDate!)}`, "Nobody has told us they joined"] : [panelRow.statusText]}
        contact={c ? { name: c.name || c.email, phone: c.phone, line: [c.role ? c.role.toUpperCase() : "", panelRow.clientName, c.phone].filter(Boolean).join(" · ") } : null}
        ask={joining ? [`Has ${joining.candidateName} joined?`, "If not, when will they join?"] : ["Where does this stand on your side?"]}
      />
    );
  } else if (panelRow && sp.panel === "ask-ta-cvs") {
    const pos = byId.get(panelRow.id)!;
    const name = pos.primaryTaId ? taName(pos.primaryTaId) : null;
    panel = (
      <AskTaPanel
        positionId={pos.id}
        closeHref={here}
        nextHref={nextOf("ask-ta", "ask-ta-cvs")}
        sendHref={"/positions?send=ask-ta&on=" + pos.id}
        title={name ? `Ask ${first(name)} for CVs` : "Ask the TA for CVs"}
        sub={`${panelRow.clientName} > ${panelRow.title}`}
        why={[panelRow.statusText, `${memberIn(db, pos.ownerId)?.name ?? "Somebody"} owns this role and the client waits for the first set`]}
        ta={name ? { name, line: "TA" } : null}
        message={`Hi ${name ? first(name) : "there"}, ${panelRow.clientName}, ${panelRow.title}. Can you send the CVs you have so far? Thank you, ${first(me.name)}`}
      />
    );
  }

  const counter = (r: RoleRow, k: StepKey) => (r.counts[k] === null ? "–" : String(r.counts[k]));
  const stepBar = (r: RoleRow, k: StepKey) =>
    r.problemStep === k ? BAR[r.tone] : (r.counts[k] ?? 0) > 0 ? (k === "join" || k === "guar" ? BAR.ok : BAR.info) : "bg-rule";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Positions"
        sub={`${openRows.length} open · ${mine} mine · week ${week}`}
        right={
          <div className="flex items-center gap-2.5">
            <Link href={panelHref("/positions", sp, "weekly-report")} scroll={false} className={pillSecondary}>
              Weekly report
            </Link>
            <Link href={panelHref("/positions", sp, "new-position")} scroll={false} className={pillPrimary}>
              <Icon name="plus" size={16} />
              New position
            </Link>
          </div>
        }
      />

      {sp.msg && !sp.panel && <p className="t-small rounded-[14px] bg-sunk px-4 py-3 text-ink">{sp.msg}</p>}

      <Card className="!py-6">
        <div className="grid grid-cols-2 gap-y-5 md:grid-cols-5 md:divide-x md:divide-rule">
          {[
            { label: "Needs you", value: view.needsYou, cls: "text-warn", sub: "act today" },
            { label: "With the client", value: view.withClient, cls: "text-info", sub: view.withClient ? `oldest day ${view.oldestWaitDays}` : "nothing waiting" },
            { label: "Interviews", value: view.interviews, cls: "text-info", sub: `${view.interviewsThisWeek} this week` },
            { label: "Joining", value: view.joining, cls: "text-ok", sub: view.nextJoinAt ? `next ${dayMonth(view.nextJoinAt)}` : "nobody due" },
            { label: "On hold", value: view.onHold, cls: "text-ink", sub: "paused roles" },
          ].map((t) => (
            <div key={t.label} className="flex flex-col gap-1 px-7 first:pl-0">
              <span className="t-micro text-ink-3">{t.label.toUpperCase()}</span>
              <span className={"text-[40px] font-light leading-[50px] " + t.cls}>{t.value}</span>
              <span className="t-small text-ink-3">{t.sub}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid items-start gap-6 pg-xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Card className="!py-4">
            <div className="flex flex-wrap items-center gap-3">
              <form action="/positions" method="get" className="flex h-11 w-full max-w-[320px] items-center gap-2.5 rounded-full bg-sunk px-4 md:w-[320px]">
                {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
                <Icon name="find" size={18} className="shrink-0 text-ink-faint" />
                <input type="search" name="q" autoComplete="off" defaultValue={q} placeholder="Role, client or TA" className="t-body w-full bg-transparent placeholder:text-ink-faint focus:outline-none" />
              </form>
              <nav className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={href({ filter: f.key })}
                    aria-current={f.key === filter ? "page" : undefined}
                    className={"t-label rounded-full px-4 py-2 " + (f.key === filter ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-shell")}
                  >
                    {f.label}
                  </Link>
                ))}
              </nav>
              <span className="t-small ml-auto text-ink-3">Needs you first</span>
            </div>
          </Card>

          {visible.length === 0 ? (
            <EmptyState icon="find" title={view.rows.length === 0 ? "No roles yet" : "No role matches"}>
              {view.rows.length === 0 ? "A role appears here after the intro call is held, the agreement is signed and the requirement is complete, and it is handed to the TA System. \"New position\" starts a requirement for a client we already work for; an enquiry for a new company is added from Clients." : "Try another filter or a different search."}
            </EmptyState>
          ) : (
            visible.map((g) => {
              const c = contactsOf(g.rows[0].id);
              return (
                <section key={g.name} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 px-1">
                    <h2 className="t-h2">{g.name}</h2>
                    <span className="t-small text-ink-3">
                      {g.rows.length} {g.rows.length === 1 ? "role" : "roles"}
                      {c?.name ? ` · ${c.name}${c.role ? ", " + c.role.toUpperCase() : ""}` : ""}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {g.rows.map((r) => (
                      <article key={r.id} className="flex flex-col gap-4 rounded-[24px] bg-surface p-[22px] shadow-card">
                        <div className="flex items-baseline justify-between gap-3">
                          <Link href={`/positions/${r.id}?view=overview`} className="text-[17px] font-medium leading-[26px] hover:underline">
                            {r.title}
                          </Link>
                          <span className="t-small shrink-0 text-ink-3">placed {r.placed}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2.5">
                          {STEPS.map((s) => (
                            <div key={s.key} className="flex flex-col gap-1.5">
                              <span className={"h-[5px] rounded-full " + stepBar(r, s.key)} />
                              <span className={"t-small " + ((r.counts[s.key] ?? 0) > 0 ? "text-ink" : "text-ink-faint")}>
                                {s.label} {counter(r, s.key)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="t-small flex min-w-0 flex-1 items-center gap-2 text-ink-2">
                            <span className={"size-[7px] shrink-0 rounded-full " + BAR[r.tone]} aria-hidden="true" />
                            <span className="truncate">{r.statusText}</span>
                          </span>
                          {r.action && (
                            <Link href={actionHref(r)} scroll={false} className={pillPrimary + " !px-4 !py-2"}>
                              {r.action.label}
                            </Link>
                          )}
                          {(!r.action || r.tone !== "danger") && (
                            <Link href={`/positions/${r.id}?view=overview`} className={pillSecondary + " !px-4 !py-2"}>
                              Open
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {!sp.all && groups.length > SHOWN_CLIENTS && (
            <Link href={href({ all: "1" })} className={pillSecondary + " self-center"}>
              Show {groups.length - SHOWN_CLIENTS} more {groups.length - SHOWN_CLIENTS === 1 ? "client" : "clients"}
            </Link>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink px-7 py-6 text-ink-inverse shadow-card">
            <p className="t-micro flex items-center gap-2 opacity-70">
              <Icon name="sparkle" size={14} />
              WHERE IT STANDS
            </p>
            <h2 className="text-[22px] font-normal leading-[30px]">
              {view.needsYou === 0 ? "Nothing needs you today." : `${view.needsYou} ${view.needsYou === 1 ? "role needs" : "roles need"} you today.`}
            </h2>
            <p className="t-small opacity-70">
              {view.withClient
                ? `${view.oldestWaitClient} has waited longest, ${view.oldestWaitDays} days. ${view.withClient} ${view.withClient === 1 ? "role waits" : "roles wait"} on a client.`
                : "No role is waiting on a client answer."}
            </p>
            {urgent && (
              <Link href={actionHref(urgent)} scroll={false} className="t-label mt-1 self-start rounded-full bg-surface px-4 py-2 text-ink">
                Open {urgent.clientName}
              </Link>
            )}
          </section>

          <Card>
            <p className="t-micro text-ink-3">THIS WEEK</p>
            <div className="grid grid-cols-5 gap-2">
              {weekDays.map((d) => (
                <div key={d.label} className={"flex flex-col items-center rounded-[12px] py-2 " + (d.today ? "bg-bg-brand text-brand" : "bg-sunk text-ink")}>
                  <span className="t-micro">{d.label}</span>
                  <span className="t-body-m">{d.num}</span>
                  <span className={"mt-0.5 size-1 rounded-full " + (d.has ? "bg-current" : "bg-transparent")} />
                </div>
              ))}
            </div>
            {events.length === 0 ? (
              <p className="t-small text-ink-3">No interview is booked and nobody is due to join in the next weeks.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {events.slice(0, 6).map((e, i) => (
                  <Link key={i} href={e.href} className={"flex flex-col gap-0.5 rounded-[14px] border-l-[3px] px-4 py-3 " + (e.tone === "ok" ? "border-success bg-bg-brand" : "border-info bg-info-soft")}>
                    <span className="t-small text-ink-2">{e.when}</span>
                    <span className="t-body-m">{e.title}</span>
                    <span className="t-small text-ink-3">{e.sub}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>

      {panel}
      {sp.send && (
        <PositionSendModal
          send={sp.send}
          on={sp.on}
          db={db}
          me={me}
          taPeople={taList}
          closeHref={closeSendHref("/positions", sp)}
        />
      )}
    </div>
  );
}
