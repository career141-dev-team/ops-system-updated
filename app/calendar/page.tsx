import Link from "next/link";
import { redirect } from "next/navigation";

import { startInterview } from "@/app/actions";
import Icon from "@/app/Icon";
import { Card, ChoiceGroup, DataTable, PageTitle, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { clientForLead, clientIn, desk, interviewsNewestFirst, positionIn } from "@/data/desk";
import { CALENDAR_FILTERS, clockOf, dayWord, filterCards, filterFrom, saturdayAfter, weekLabel, type CalendarKind } from "@/lib/calendarBoard";
import { FORMAT_MEANINGS, boardStatus, isOff, weekDays, type InterviewFormat } from "@/lib/interviews";
import { SUMMARY_MODES, SUMMARY_STATUSES, filterSummary, summaryRows } from "@/lib/interviewSummary";
import { closeHref, panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** The card colours of the frame, one per kind. */
const KIND_STYLE: Record<CalendarKind, { box: string; clock: string; dot: string; legend: string }> = {
  client: { box: "bg-info-soft", clock: "text-info", dot: "bg-info", legend: "Client interview" },
  internal: { box: "bg-violet-soft", clock: "text-violet", dot: "bg-violet", legend: "Internal interview" },
  joining: { box: "bg-brand-soft", clock: "text-brand", dot: "bg-brand", legend: "Joining day" },
  meeting: { box: "bg-sunk", clock: "text-ink-2", dot: "bg-ink-2", legend: "Meeting" },
};

interface CalendarEvent {
  id: string;
  kind: CalendarKind;
  ownerId: string | null;
  when: number | null;
  title: string;
  sub: string;
  href: string;
  /** Present for client interviews so the right-hand Selected & Not-booked cards work identically. */
  iv?: ReturnType<typeof interviewsNewestFirst>[number];
  status?: ReturnType<typeof boardStatus>;
  clientName?: string;
  roleTitle?: string;
  positionId?: string | null;
}

/**
 * K1 · Calendar. The week of client interviews, intro/requirement meetings, and joining days,
 * Monday to Saturday, with the selected item on the right, unbooked interviews below it, and a
 * 680px `?panel=start-interview` drawer to start a new interview right from the calendar.
 * Internal interviews are the booked applicants of the internal hiring vacancies.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ weekOffset?: string; msg?: string; show?: string; on?: string; panel?: string; view?: string; client?: string; mode?: string; status?: string; from?: string; to?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const sp = await searchParams;
  const { weekOffset: raw = "0", msg, show, on, panel } = sp;
  const offset = Number.parseInt(raw, 10) || 0;
  const filter = filterFrom(show);
  const mayManage = can(me, "client.manage");
  const table = sp.view === "table";

  const here = (o: { weekOffset?: number; show?: string; on?: string }) => {
    const q = new URLSearchParams();
    const w = o.weekOffset ?? offset;
    if (w) q.set("weekOffset", String(w));
    const f = o.show ?? filter;
    if (f !== "team") q.set("show", f);
    if (o.on) q.set("on", o.on);
    const s = q.toString();
    return "/calendar" + (s ? "?" + s : "");
  };

  const db = await desk();
  const now = Date.now();
  const week = weekDays(now, offset);
  const days = [...week.days, saturdayAfter(week.days[4].endMs, now)];

  // 1. Client interviews
  const interviewItems: CalendarEvent[] = interviewsNewestFirst(db).map((iv) => {
    const position = iv.positionId ? positionIn(db, iv.positionId) : (db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null);
    const client = iv.clientId ? clientIn(db, iv.clientId) : position?.clientId ? clientIn(db, position.clientId) : null;
    const clientName = client?.name ?? "Client";
    return {
      id: iv.id,
      kind: "client",
      ownerId: iv.ownerId,
      when: isOff(iv.state) ? null : iv.at,
      title: iv.candidateName,
      sub: `Round ${iv.round} · client interview`,
      href: here({ on: iv.id }),
      iv,
      status: boardStatus(iv),
      clientName,
      roleTitle: position?.title ?? iv.openingTaId,
      positionId: position?.id ?? iv.positionId,
    };
  });

  // 2. Booked meetings (intro calls & requirement meetings)
  const meetingItems: CalendarEvent[] = db.meetings
    .filter((m) => m.state === "booked" && m.at)
    .map((m) => {
      const lead = db.leads.find((l) => l.id === m.leadId);
      const client = clientForLead(db, m.leadId);
      const who = client?.name ?? lead?.company ?? "Client";
      const label = m.kind === "requirement" ? "Requirement meeting" : "Intro call";
      return {
        id: "mtg_" + m.id,
        kind: "meeting",
        ownerId: lead?.ownerId ?? client?.ownerId ?? null,
        when: m.at,
        title: who,
        sub: label,
        href: lead ? `/leads/${lead.id}?step=${m.kind === "requirement" ? "requirement" : "intro"}` : client ? `/clients/${client.id}` : "/leads",
      };
    });

  // 3. Joining days (placements with a scheduled or completed joinDate)
  const joiningItems: CalendarEvent[] = db.placements
    .filter((pl) => pl.joinDate && pl.state !== "cancelled" && pl.state !== "no_show")
    .map((pl) => {
      const client = pl.clientId ? clientIn(db, pl.clientId) : null;
      const pos = pl.positionId ? positionIn(db, pl.positionId) : null;
      return {
        id: "pl_" + pl.id,
        kind: "joining",
        ownerId: pl.ownerId,
        when: pl.joinDate,
        title: "Joining day",
        sub: [pl.candidateName, client?.name].filter(Boolean).join(" · "),
        href: pos ? `/positions/${pos.id}?view=offer` : `/placements/${pl.id}`,
      };
    });

  // 4. Internal hiring interviews (H2 booked applicants, kept visible once shortlisted or offered)
  const internalItems: CalendarEvent[] = (db.applicants ?? [])
    .filter((a) => ["interview", "shortlisted", "offered", "decision"].includes(a.stage) && a.interviewAt !== null)
    .map((a) => {
      const vac = (db.vacancies ?? []).find((v) => v.id === a.vacancyId);
      return {
        id: "ih_" + a.id,
        kind: "internal",
        ownerId: vac?.ownerId ?? null,
        when: a.interviewAt,
        title: a.name,
        sub: [vac?.title ?? "Internal hiring", a.place].filter(Boolean).join(" · "),
        href: `/hiring/${a.vacancyId}`,
      };
    });

  const all: CalendarEvent[] = [...interviewItems, ...meetingItems, ...joiningItems, ...internalItems];
  const cards = filterCards(all, filter, me.id);
  const booked = cards.filter((c) => c.when !== null).sort((a, b) => (a.when as number) - (b.when as number));
  const notBooked = cards.filter((c) => c.iv && c.status?.needsTime && c.when === null);

  // Any item can be picked (v6 K1): a click selects it and the card on the right says what it is. Nothing is
  // chosen for you but the first client interview of the week, as before.
  const selected =
    booked.find((c) => c.id === on) ??
    booked.find((c) => c.iv && c.when! >= week.days[0].startMs && c.when! < days[5].endMs) ??
    null;
  const selectedIv = selected?.iv ? selected : null;
  const selectedOther = selected && !selected.iv ? selected : null;

  const roleLink = (c: CalendarEvent, p: string) => (c.positionId && c.iv ? `/positions/${c.positionId}?view=interviews&panel=${p}&on=${c.iv.id}` : null);
  const roundWord = (c: CalendarEvent) => (c.iv && c.iv.round > 1 ? "Round " + c.iv.round : "First round");

  const openPositions = db.positions.filter((p) => p.stage !== "closed" && Boolean(p.openingTaId));

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Calendar"
        sub="Your week and the team's"
        right={
          <div className="flex flex-wrap items-center gap-3">
            {!table && (
              <>
                <Link href={here({ weekOffset: offset - 1 })} aria-label="Earlier week" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
                  <Icon name="chevron-left" size={18} />
                </Link>
                <span className="t-body-m">{weekLabel(week.days[0].startMs)}</span>
                <Link href={here({ weekOffset: offset + 1 })} aria-label="Later week" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
                  <Icon name="chevron-right" size={18} />
                </Link>
              </>
            )}
          </div>
        }
      />
      {msg && (
        <p role="status" className="t-body rounded-[18px] bg-sunk px-5 py-3">
          {msg}
        </p>
      )}

      {table && <InterviewTable db={db} now={now} sp={sp} />}
      <nav className={"flex flex-wrap items-center gap-2" + (table ? " hidden" : "")} aria-label="Show">
        {CALENDAR_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={here({ show: f.key })}
            aria-current={f.key === filter ? "page" : undefined}
            className={"t-label rounded-full px-3.5 py-[7px] " + (f.key === filter ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-2 hover:bg-shell")}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className={"flex flex-col items-start gap-[22px] pg-xl:flex-row" + (table ? " hidden" : "")}>
        <div className="w-full min-w-0 flex-1">
          <Card className="gap-[18px] !p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 pg-xl:grid-cols-6">
              {days.map((day) => {
                const there = booked.filter((c) => c.when! >= day.startMs && c.when! < day.endMs);
                return (
                  <div key={day.name} className="flex min-h-[120px] flex-col gap-2 pg-xl:min-h-[560px] pg-xl:border-l pg-xl:border-rule pg-xl:pl-3 pg-xl:first:border-l-0 pg-xl:first:pl-0">
                    <div className={"flex flex-col gap-0.5 rounded-[14px] px-2.5 py-2 " + (day.isToday ? "bg-brand-soft text-brand" : "")}>
                      <p className={"t-micro " + (day.isToday ? "" : "text-ink-3")}>{day.name}</p>
                      <p className={"t-h2 " + (day.isToday ? "" : "text-ink")}>{day.dayNum}</p>
                    </div>
                    <div className="h-px bg-rule" />
                    {there.map((c) => {
                      const st = KIND_STYLE[c.kind];
                      const isSel = selected?.id === c.id;
                      return (
                        <Link
                          key={c.id}
                          href={here({ on: c.id })}
                          scroll={false}
                          className={`flex flex-col gap-0.5 rounded-[14px] px-3 py-2.5 ${st.box} ${isSel ? "border-2 border-info" : "border-2 border-transparent"}`}
                        >
                          <span className={"t-small " + st.clock}>
                            {c.kind === "joining" && clockOf(c.when!) === "00:00" ? "All day" : clockOf(c.when!)}
                          </span>
                          <span className="t-body-m">{c.title}</span>
                          <span className="t-small text-ink-3">{c.sub}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {booked.length === 0 && (
              <p className="t-small text-ink-3">
                {filter === "internal"
                  ? "No internal interviews are booked yet."
                  : "Nothing is booked for this filter yet."}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-5">
              {(Object.keys(KIND_STYLE) as CalendarKind[]).map((k) => (
                <span key={k} className="t-small flex items-center gap-1.5 text-ink-3">
                  <span className={"size-2 rounded-[4px] " + KIND_STYLE[k].dot} />
                  {KIND_STYLE[k].legend}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 pg-xl:w-[360px]">
          {selectedIv && selectedIv.iv && (
            <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Selected</p>
              <Link href={`/interviews/${selectedIv.iv.id}`} className="t-h2 hover:underline">
                {selectedIv.iv.candidateName}
              </Link>
              <p className="t-body-m">
                {roundWord(selectedIv)} · {dayWord(selectedIv.when!)}, {clockOf(selectedIv.when!)}
              </p>
              <p className="t-small text-ink-3">
                {selectedIv.clientName} · {selectedIv.roleTitle}. {FORMAT_MEANINGS[selectedIv.iv.format as InterviewFormat] ?? selectedIv.iv.format}
                {selectedIv.iv.interviewers.length > 0 ? ", with " + selectedIv.iv.interviewers.join(", ") : ""}.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className={"t-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 " + (selectedIv.iv.state === "reconfirmed" ? "bg-brand-soft text-brand" : "bg-warn-soft text-warn")}>
                  <span className={"size-1.5 rounded-[3px] " + (selectedIv.iv.state === "reconfirmed" ? "bg-brand" : "bg-warn")} />
                  {selectedIv.iv.state === "reconfirmed" ? "Client reconfirmed" : selectedIv.status?.label}
                </span>
              </div>
              <div className="flex gap-2.5 pt-1">
                {selectedIv.iv.state === "booked" && roleLink(selectedIv, "reconfirm") && (
                  <Link href={roleLink(selectedIv, "reconfirm")!} className={pillPrimary}>
                    Reconfirmed
                  </Link>
                )}
                {roleLink(selectedIv, "find-a-time") && (
                  <Link href={roleLink(selectedIv, "find-a-time")!} className={pillSecondary}>
                    Move
                  </Link>
                )}
              </div>
            </section>
          )}
          {selectedOther && (
            <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Selected</p>
              <p className="t-h2">{selectedOther.title}</p>
              <p className="t-body-m">
                {dayWord(selectedOther.when!)}
                {selectedOther.kind === "joining" ? "" : ", " + clockOf(selectedOther.when!)}
              </p>
              <p className="t-small text-ink-3">
                {selectedOther.sub}. {KIND_STYLE[selectedOther.kind].legend}.
              </p>
              <div className="flex gap-2.5 pt-1">
                <Link href={selectedOther.href} className={pillPrimary}>
                  Open
                </Link>
              </div>
            </section>
          )}
          {notBooked.map((c) => (
            <section key={c.id} className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Not booked yet</p>
              <p className="t-body-m">{c.title}</p>
              <p className="t-small text-ink-3">
                {roundWord(c)} · {c.clientName} · {c.roleTitle}.
                {c.iv && c.iv.slots.length > 0 ? " Offered: " + c.iv.slots.map((s) => dayWord(s) + " at " + clockOf(s)).join(" or ") + "." : ""}
              </p>
              {roleLink(c, "find-a-time") && (
                <div className="pt-1">
                  <Link href={roleLink(c, "find-a-time")!} className={pillSecondary}>
                    Find a time
                  </Link>
                </div>
              )}
            </section>
          ))}
          {!selected && notBooked.length === 0 && (
            <section className="flex flex-col gap-2 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Selected</p>
              <p className="t-small text-ink-3">Nothing selected. Pick an item in the week.</p>
            </section>
          )}
        </aside>
      </div>

      {panel === "start-interview" && mayManage && (
        <Panel
          kicker="Calendar"
          title="Start an interview"
          sub="Pick the opening and candidate, and say who agrees the time."
          closeHref={closeHref("/calendar", sp)}
        >
          <form action={startInterview} className="flex flex-col">
            <input type="hidden" name="back" value={closeHref("/calendar", sp)} />
            <PanelSection title="Who and which role">
              <PanelField label="Opening">
                <select name="openingTaId" required className={panelInput}>
                  <option value="">Choose an open role…</option>
                  {openPositions.map((p) => {
                    const cl = p.clientId ? clientIn(db, p.clientId)?.name : null;
                    return (
                      <option key={p.id} value={p.openingTaId ?? ""}>
                        {cl ? `${cl} — ${p.title}` : p.title}
                      </option>
                    );
                  })}
                </select>
              </PanelField>
              <PanelField label="Candidate name">
                <input name="candidateName" required placeholder="Full name as TA has it" className={panelInput} />
              </PanelField>
              <PanelField label="TA Application ID">
                <input name="applicationTaId" required placeholder="e.g. app_104" className={panelInput} />
              </PanelField>
              <PanelField label="Round">
                <input name="round" type="number" min={1} defaultValue={1} className={panelInput + " w-[120px]"} />
              </PanelField>
            </PanelSection>
            <PanelSection title="Who agrees the time?">
              <ChoiceGroup
                name="scheduler"
                label="Who agrees the time"
                value="us"
                options={[
                  { value: "us", label: "We schedule it" },
                  { value: "client", label: "Client books directly" },
                ]}
              />
            </PanelSection>
            <PanelSection title="What happens next">
              <p className="t-body text-ink-2">
                The interview opens on the role&apos;s Interviews tab so you can collect offered times or record the client&apos;s booking.
              </p>
              <div className="flex gap-2.5">
                <button type="submit" className={pillPrimary}>
                  Start interview
                </button>
                <Link href={closeHref("/calendar", sp)} scroll={false} className={pillSecondary}>
                  Cancel
                </Link>
              </div>
            </PanelSection>
          </form>
        </Panel>
      )}
    </div>
  );
}

/** The interview summary (23 Nov): every client and internal interview as a row, filterable, in the team's words. */
function InterviewTable({ db, now, sp }: { db: Awaited<ReturnType<typeof desk>>; now: number; sp: { client?: string; mode?: string; status?: string; from?: string; to?: string } }) {
  const all = summaryRows(db, now);
  const rows = filterSummary(all, { client: sp.client, mode: sp.mode, status: sp.status, from: sp.from, to: sp.to });
  const field = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";
  return (
    <Card className="gap-4 !p-6">
      <form method="get" action="/calendar" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value="table" />
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Client</span>
          <input name="client" defaultValue={sp.client ?? ""} placeholder="Any client" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Mode</span>
          <select name="mode" defaultValue={sp.mode ?? ""} className={field}>
            <option value="">Any</option>
            {SUMMARY_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className={field}>
            <option value="">Any</option>
            {SUMMARY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">From</span>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-small text-ink-3">To</span>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={field} />
        </label>
        <button type="submit" className={pillSecondary}>
          Filter
        </button>
        <Link href="/calendar?view=table" className="t-small pb-2 text-ink-3 hover:underline">
          Clear
        </Link>
      </form>
      <p className="t-small text-ink-3">
        {rows.length} of {all.length} {all.length === 1 ? "interview" : "interviews"}
      </p>
      <DataTable
        columns={[{ label: "CLIENT" }, { label: "CANDIDATE" }, { label: "MODE" }, { label: "SCHEDULE" }, { label: "STATUS" }]}
        rows={rows.map((r) => ({
          key: r.id,
          href: r.href,
          cells: [
            r.client,
            <span key="c" className="flex flex-col">
              <span className="t-body-m">{r.candidate}</span>
              <span className="t-small text-ink-3">{r.detail}</span>
            </span>,
            r.mode ?? "Not set",
            r.at ? dayWord(r.at) + ", " + clockOf(r.at) : "No time yet",
            r.status,
          ],
        }))}
        empty={<p className="t-body text-ink-3">No interviews match. Clear the filters, or start one with Start interview.</p>}
      />
    </Card>
  );
}
