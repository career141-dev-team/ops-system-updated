import Link from "next/link";
import { redirect } from "next/navigation";

import { startInterview } from "@/app/actions";
import Icon from "@/app/Icon";
import { PageBox, StatusChip, ViewPills, figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";
import {
  clientIn,
  desk,
  interviewsNewestFirst,
  positionIn,
  positionsNewestFirst,
  runClocks,
} from "@/data/desk";
import { boardStatus, interviewInWords, weekDays, type BoardStatus } from "@/lib/interviews";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** The card's dot, by the tone `boardStatus` chose. */
const DOT: Record<BoardStatus["tone"], string> = {
  ok: "bg-success",
  warn: "bg-warn",
  violet: "bg-violet",
  info: "bg-info",
  danger: "bg-danger",
  quiet: "bg-ink-faint",
};

const FILTERS = [
  { key: "needs_time", label: "Needs a time" },
  { key: "needs_feedback", label: "Needs feedback" },
  { key: "rebook", label: "To rebook" },
] as const;

/**
 * IV · Interviews — this week (Figma 249:9996).
 *
 * Monday to Friday of the week you are looking at, one outlined column a day, today's outlined
 * in green. Each interview is a card on the day it is booked for - or, while the time is still
 * being agreed, on the first time the client offered. The three pills beside "This week" are
 * queues of work, so each one lists what is in it instead of the board.
 */
export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; filter?: string; weekOffset?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, filter = "week", weekOffset: rawOffset = "0" } = await searchParams;
  const weekOffset = Number.parseInt(rawOffset, 10) || 0;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const openings = positionsNewestFirst(db).filter((p) => p.openingTaId && p.stage !== "closed");
  const mayManage = can(me, "client.manage");

  const items = interviewsNewestFirst(db).map((iv) => {
    const position = iv.positionId ? positionIn(db, iv.positionId) : (db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null);
    const client = iv.clientId ? clientIn(db, iv.clientId) : position?.clientId ? clientIn(db, position.clientId) : null;
    // The day it sits on: when it is booked for, else the first time the client offered.
    const when = iv.at ?? iv.slots[0] ?? null;
    return {
      iv,
      clientName: client?.name ?? "Client",
      roleTitle: position?.title ?? iv.openingTaId,
      status: boardStatus(iv),
      when,
      timeStr: when ? new Date(when + 5.5 * 3_600_000).toISOString().slice(11, 16) : "Time TBC",
    };
  });

  const week = weekDays(now, weekOffset);
  const firstMs = week.days[0].startMs;
  const fridayEnd = week.days[4].endMs;
  const onBoard = items.filter((i) => i.when !== null && i.when >= firstMs && i.when < fridayEnd);
  const weekend = items.filter((i) => i.when !== null && i.when >= fridayEnd && i.when < week.endMs);

  const queue = (key: string) => items.filter((i) => (key === "needs_time" ? i.status.needsTime : key === "needs_feedback" ? i.status.needsFeedback : i.status.toRebook));
  const counts = { needs_time: queue("needs_time").length, needs_feedback: queue("needs_feedback").length, rebook: queue("rebook").length };
  const listed = filter === "week" ? [] : queue(filter);
  const href = (f: string, offset = weekOffset) => `/interviews?filter=${f}&weekOffset=${offset}`;

  const arrow = "flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sunk";

  return (
    <PageBox width="full" msg={msg} className="gap-6 md:flex-1">
      <ViewPills
        active={filter}
        items={[
          { key: "week", label: "This week", count: onBoard.length, href: href("week") },
          ...FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts[f.key], href: href(f.key) })),
        ]}
        rightSlot={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {filter === "week" && (
              <div className="flex items-center gap-2">
                <Link href={href("week", weekOffset - 1)} aria-label="Previous week" className={arrow}>
                  <Icon name="chevron-left" size={18} />
                </Link>
                <span className="px-1 text-[14px] font-medium leading-[21px] text-ink">{week.rangeLabel}</span>
                <Link href={href("week", weekOffset + 1)} aria-label="Next week" className={arrow}>
                  <Icon name="chevron-right" size={18} />
                </Link>
              </div>
            )}

            {mayManage && (
              <details className="group relative">
                <summary className={pillPrimary}>
                  <Icon name="plus" size={16} />
                  Start an interview
                </summary>
                <div className="mt-2 w-full min-w-[340px] max-w-full rounded-[24px] border border-rule bg-surface p-5 shadow-float md:w-[440px]">
                  <p className={figmaLabel}>START AN INTERVIEW FOR A SHORTLISTED CANDIDATE</p>
                  <form action={startInterview} className="mt-3 flex flex-col gap-3">
                    <label className={figmaLabel}>
                      The opening
                      <select name="openingTaId" className={figmaField} defaultValue="">
                        <option value="">— pick one —</option>
                        {openings.map((p) => (
                          <option key={p.id} value={p.openingTaId ?? ""}>
                            {p.title} · {p.openingTaId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <label className={figmaLabel}>
                        Candidate ID in TA
                        <input name="applicationTaId" placeholder="ta_a1" className={figmaField} />
                      </label>
                      <label className={figmaLabel}>
                        Candidate name
                        <input name="candidateName" placeholder="Tharindu Silva" className={figmaField} />
                      </label>
                    </div>
                    <label className={figmaLabel}>
                      Who agrees the time
                      <select name="scheduler" className={figmaField} defaultValue="us">
                        <option value="us">We do — we ask the client for times</option>
                        <option value="client">The client books it and tells us the date</option>
                      </select>
                    </label>
                    <button type="submit" className={`${pillPrimary} self-start`}>
                      Start interview
                    </button>
                  </form>
                </div>
              </details>
            )}
          </div>
        }
      />

      {filter === "week" ? (
        <>
          <div className="grid grid-cols-1 gap-3.5 md:min-h-[360px] md:flex-1 md:grid-cols-5 md:gap-6">
            {week.days.map((day) => {
              const here = onBoard.filter((i) => i.when! >= day.startMs && i.when! < day.endMs).sort((a, b) => a.when! - b.when!);
              return (
                <div
                  key={day.name}
                  className={"flex min-h-[160px] flex-col gap-2.5 rounded-[24px] px-3.5 py-4 md:min-h-0 " + (day.isToday ? "border border-brand" : "border-[3px] border-paper")}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className={"text-[26px] leading-[34px] " + (day.isToday ? "text-brand" : "text-ink")}>{day.dayNum}</span>
                    <span className="text-[14px] leading-[21px] text-ink-faint">{day.name}</span>
                  </div>

                  {here.length === 0 ? (
                    <p className="px-1 text-[14px] leading-[21px] text-ink-faint">Nothing booked</p>
                  ) : (
                    here.map(({ iv, clientName, timeStr, status }) => (
                      <Link
                        key={iv.id}
                        href={`/interviews/${iv.id}`}
                        className={
                          "flex flex-col gap-[3px] rounded-2xl border-[1.5px] bg-surface px-4 py-3.5 shadow-card transition-shadow hover:shadow-float " +
                          (day.isToday ? "border-brand/25" : "border-black/[0.06]")
                        }
                      >
                        <span className="text-[14px] font-medium leading-[21px] text-ink-soft">{timeStr}</span>
                        <span className="text-[16px] font-medium leading-[26px] text-ink">{iv.candidateName}</span>
                        <span className="text-[14px] leading-[21px] text-ink-faint">{clientName}</span>
                        <span className="flex items-center gap-1.5 pt-1.5">
                          <span aria-hidden="true" className={"size-[7px] shrink-0 rounded-full " + DOT[status.tone]} />
                          <span className="text-[14px] leading-[21px] text-ink-soft">{status.label}</span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* A Saturday or Sunday interview has no column; it is said here rather than lost. */}
          {weekend.length > 0 && (
            <p className="text-[14px] leading-[21px] text-ink-faint">
              On the weekend:{" "}
              {weekend.map(({ iv, timeStr }, i) => (
                <span key={iv.id}>
                  {i > 0 && ", "}
                  <Link href={`/interviews/${iv.id}`} className="text-ink-soft hover:text-ink hover:underline">
                    {iv.candidateName} {timeStr}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          {listed.length === 0 ? (
            <p className="rounded-[20px] bg-sunk px-5 py-6 text-[14px] text-ink-soft">Nothing waiting in this view right now.</p>
          ) : (
            listed.map(({ iv, clientName, roleTitle, status }) => (
              <Link
                key={iv.id}
                href={`/interviews/${iv.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-rule bg-surface px-5 py-4 transition-colors hover:bg-sunk"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[16px] font-medium leading-[26px] text-ink">
                    {iv.candidateName} · {clientName}
                  </span>
                  <span className="text-[14px] leading-[21px] text-ink-soft">
                    {roleTitle} · Round {iv.round} · {interviewInWords(iv, now)}
                  </span>
                </span>
                <span className="flex items-center gap-2.5">
                  <StatusChip label={status.label} tone={status.tone} />
                  <Icon name="chevron-right" size={18} className="text-ink-faint" />
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </PageBox>
  );
}
