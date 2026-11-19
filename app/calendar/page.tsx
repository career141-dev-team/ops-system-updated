import Link from "next/link";
import { redirect } from "next/navigation";

import { PageBox, StatusChip, figmaLabel } from "@/app/ui/figma";
import { clientIn, desk, interviewsNewestFirst, positionIn } from "@/data/desk";
import { boardStatus, weekDays } from "@/lib/interviews";
import { currentMember } from "@/lib/session";

/**
 * K1 · Calendar. The week board of interviews the desk already holds; other meetings
 * and a month view have no backend yet and are not drawn.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ weekOffset?: string; msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { weekOffset: raw = "0", msg } = await searchParams;
  const offset = Number.parseInt(raw, 10) || 0;

  const db = await desk();
  const { days, rangeLabel } = weekDays(Date.now(), offset);
  const items = interviewsNewestFirst(db).map((iv) => {
    const position = iv.positionId ? positionIn(db, iv.positionId) : (db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null);
    const client = iv.clientId ? clientIn(db, iv.clientId) : position?.clientId ? clientIn(db, position.clientId) : null;
    return { iv, status: boardStatus(iv), when: iv.at ?? iv.slots[0] ?? null, clientName: client?.name ?? "Client", roleTitle: position?.title ?? iv.openingTaId };
  });

  return (
    <PageBox width="1160" msg={msg} className="gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[40px] font-light leading-[50px] text-ink">Calendar</h1>
          <p className="text-[14px] text-ink-soft">{rangeLabel}</p>
        </div>
        <div className="flex gap-3 text-[14px]">
          <Link href={`/calendar?weekOffset=${offset - 1}`}>Earlier</Link>
          <Link href="/calendar">This week</Link>
          <Link href={`/calendar?weekOffset=${offset + 1}`}>Later</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {days.map((day) => {
          const here = items.filter((x) => x.when !== null && x.when >= day.startMs && x.when < day.endMs);
          return (
            <div key={day.name} className="flex flex-col gap-2 rounded-[20px] border border-rule p-3">
              <p className={figmaLabel}>
                {day.name} {day.dayNum}
                {day.isToday ? " · today" : ""}
              </p>
              {here.length === 0 ? (
                <p className="text-[13px] text-ink-faint">Nothing booked.</p>
              ) : (
                here.map(({ iv, status, clientName, roleTitle }) => (
                  <Link key={iv.id} href={`/interviews/${iv.id}`} className="flex flex-col gap-1 rounded-[16px] bg-sunk px-3 py-2 hover:bg-shell">
                    <span className="text-[14px] font-medium text-ink">{iv.candidateName}</span>
                    <span className="text-[12px] text-ink-soft">
                      {clientName} · {roleTitle}
                    </span>
                    <StatusChip label={status.label} tone="info" />
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>
      <p className="rounded-[24px] bg-sunk px-6 py-4 text-[14px] text-ink-soft">
        Team meetings, requirement calls and a month view are not connected to the calendar yet. Only interviews show here.
      </p>
    </PageBox>
  );
}
