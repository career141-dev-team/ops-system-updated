import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Card, PageTitle, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { clientIn, desk, interviewsNewestFirst, positionIn } from "@/data/desk";
import { CALENDAR_FILTERS, clockOf, dayWord, filterCards, filterFrom, saturdayAfter, weekLabel, type CalendarKind } from "@/lib/calendarBoard";
import { FORMAT_MEANINGS, boardStatus, weekDays, type InterviewFormat } from "@/lib/interviews";
import { currentMember } from "@/lib/session";

/** The card colours of the frame, one per kind. */
const KIND_STYLE: Record<CalendarKind, { box: string; clock: string; dot: string; legend: string }> = {
  client: { box: "bg-info-soft", clock: "text-info", dot: "bg-info", legend: "Client interview" },
  internal: { box: "bg-violet-soft", clock: "text-violet", dot: "bg-violet", legend: "Internal interview" },
  meeting: { box: "bg-sunk", clock: "text-ink-2", dot: "bg-ink-2", legend: "Meeting" },
  joining: { box: "bg-brand-soft", clock: "text-brand", dot: "bg-brand", legend: "Joining day" },
};

/**
 * K1 · Calendar. The week of interviews the desk holds, Monday to Saturday, with the one you
 * select on the right and the ones not booked yet under it. Internal interviews, team meetings
 * and joining days have no source yet, so their filters are drawn and show nothing.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ weekOffset?: string; msg?: string; show?: string; on?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { weekOffset: raw = "0", msg, show, on } = await searchParams;
  const offset = Number.parseInt(raw, 10) || 0;
  const filter = filterFrom(show);
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

  const all = interviewsNewestFirst(db).map((iv) => {
    const position = iv.positionId ? positionIn(db, iv.positionId) : (db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null);
    const client = iv.clientId ? clientIn(db, iv.clientId) : position?.clientId ? clientIn(db, position.clientId) : null;
    return {
      iv,
      kind: "client" as const,
      ownerId: iv.ownerId as string | null,
      status: boardStatus(iv),
      when: iv.at,
      clientName: client?.name ?? "Client",
      roleTitle: position?.title ?? iv.openingTaId,
      positionId: position?.id ?? iv.positionId,
    };
  });
  type Item = (typeof all)[number];
  const cards = filterCards(all, filter, me.id);
  const booked = cards.filter((c) => c.when !== null && c.iv.state !== "cancelled").sort((a, b) => (a.when as number) - (b.when as number));
  const notBooked = cards.filter((c) => c.status.needsTime && c.when === null);
  const selected = booked.find((c) => c.iv.id === on) ?? booked.find((c) => c.when! >= week.days[0].startMs && c.when! < days[5].endMs) ?? null;
  const roleLink = (c: Item, panel: string) => (c.positionId ? `/positions/${c.positionId}?view=interviews&panel=${panel}&on=${c.iv.id}` : null);
  const roundWord = (c: Item) => (c.iv.round > 1 ? "Round " + c.iv.round : "First round");

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Calendar"
        sub="Your week and the team's"
        right={
          <div className="flex items-center gap-3">
            <Link href={here({ weekOffset: offset - 1 })} aria-label="Earlier week" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
              <Icon name="chevron-left" size={18} />
            </Link>
            <span className="t-body-m">{weekLabel(week.days[0].startMs)}</span>
            <Link href={here({ weekOffset: offset + 1 })} aria-label="Later week" className="flex size-10 items-center justify-center rounded-full border border-rule bg-surface hover:bg-sunk">
              <Icon name="chevron-right" size={18} />
            </Link>
          </div>
        }
      />
      {msg && (
        <p role="status" className="t-body rounded-[18px] bg-sunk px-5 py-3">
          {msg}
        </p>
      )}

      <nav className="flex flex-wrap items-center gap-2" aria-label="Show">
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

      <div className="flex flex-col items-start gap-[22px] xl:flex-row">
        <div className="w-full min-w-0 flex-1">
          <Card className="gap-[18px] !p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {days.map((day) => {
                const there = booked.filter((c) => c.when! >= day.startMs && c.when! < day.endMs);
                return (
                  <div key={day.name} className="flex min-h-[120px] flex-col gap-2 xl:min-h-[560px] xl:border-l xl:border-rule xl:pl-3 xl:first:border-l-0 xl:first:pl-0">
                    <div className={"flex flex-col gap-0.5 rounded-[14px] px-2.5 py-2 " + (day.isToday ? "bg-brand-soft text-brand" : "")}>
                      <p className={"t-micro " + (day.isToday ? "" : "text-ink-3")}>{day.name}</p>
                      <p className={"text-[20px] font-medium leading-7 " + (day.isToday ? "" : "text-ink")}>{day.dayNum}</p>
                    </div>
                    <div className="h-px bg-rule" />
                    {there.map((c) => {
                      const st = KIND_STYLE[c.kind];
                      return (
                        <Link
                          key={c.iv.id}
                          href={here({ on: c.iv.id })}
                          scroll={false}
                          className={`flex flex-col gap-0.5 rounded-[14px] px-3 py-2.5 ${st.box} ${selected?.iv.id === c.iv.id ? "outline outline-2 -outline-offset-2 outline-info" : ""}`}
                        >
                          <span className={"t-small " + st.clock}>{clockOf(c.when!)}</span>
                          <span className="t-body-m">{c.iv.candidateName}</span>
                          <span className="t-small text-ink-3">
                            Round {c.iv.round} · {c.clientName}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {booked.length === 0 && <p className="t-small text-ink-3">Nothing is booked for this filter yet.</p>}
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

        <aside className="flex w-full shrink-0 flex-col gap-5 xl:w-[360px]">
          {selected && (
            <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Selected</p>
              <Link href={`/interviews/${selected.iv.id}`} className="text-[20px] font-medium leading-7 hover:underline">
                {selected.iv.candidateName}
              </Link>
              <p className="t-body-m">
                {roundWord(selected)} · {dayWord(selected.when!)}, {clockOf(selected.when!)}
              </p>
              <p className="t-small text-ink-3">
                {selected.clientName} · {selected.roleTitle}. {FORMAT_MEANINGS[selected.iv.format as InterviewFormat] ?? selected.iv.format}
                {selected.iv.interviewers.length > 0 ? ", with " + selected.iv.interviewers.join(", ") : ""}.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className={"t-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 " + (selected.iv.state === "reconfirmed" ? "bg-brand-soft text-brand" : "bg-warn-soft text-warn")}>
                  <span className={"size-1.5 rounded-[3px] " + (selected.iv.state === "reconfirmed" ? "bg-brand" : "bg-warn")} />
                  {selected.iv.state === "reconfirmed" ? "Client reconfirmed" : selected.status.label}
                </span>
              </div>
              <div className="flex gap-2.5 pt-1">
                {selected.iv.state === "booked" && roleLink(selected, "reconfirm") && (
                  <Link href={roleLink(selected, "reconfirm")!} className={pillPrimary}>
                    Reconfirmed
                  </Link>
                )}
                {roleLink(selected, "find-a-time") && (
                  <Link href={roleLink(selected, "find-a-time")!} className={pillSecondary}>
                    Move
                  </Link>
                )}
              </div>
            </section>
          )}
          {notBooked.map((c) => (
            <section key={c.iv.id} className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
              <p className="t-micro text-ink-3">Not booked yet</p>
              <p className="t-body-m">{c.iv.candidateName}</p>
              <p className="t-small text-ink-3">
                {roundWord(c)} · {c.clientName} · {c.roleTitle}.
                {c.iv.slots.length > 0 ? " Offered: " + c.iv.slots.map((s) => dayWord(s) + " at " + clockOf(s)).join(" or ") + "." : ""}
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
          {!selected && notBooked.length === 0 && <p className="t-small text-ink-3">Nothing selected. Pick an interview in the week.</p>}
        </aside>
      </div>
    </div>
  );
}
