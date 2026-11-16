import Link from "next/link";
import { redirect } from "next/navigation";

import { startInterview } from "@/app/actions";
import Icon from "@/app/Icon";
import {
  PageBox,
  StatusChip,
  ViewPills,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  clientIn,
  desk,
  interviewsNewestFirst,
  member as memberIn,
  positionIn,
  positionsNewestFirst,
  runClocks,
} from "@/data/desk";
import { interviewInWords } from "@/lib/interviews";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

function getMondayColombo(refMs: number, weekOffset = 0): number {
  const colomboMs = refMs + 5.5 * 3_600_000 + weekOffset * 7 * 86_400_000;
  const d = new Date(colomboMs);
  const utcDay = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMon = utcDay === 0 ? -6 : 1 - utcDay;
  const monUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMon, 0, 0, 0);
  return monUtc - 5.5 * 3_600_000;
}

/**
 * Frame 1:1105 — IV · Interviews — this week.
 *
 * 5-column Monday–Friday calendar view with filter pills (This week, Needs a time,
 * Needs feedback, To rebook), week navigation, and inline Start an interview form.
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
  const all = interviewsNewestFirst(db);
  const openings = positionsNewestFirst(db).filter((p) => p.openingTaId && p.stage !== "closed");
  const mayManage = can(me, "client.manage");

  // Enrich each interview with client name, role title, and status badge
  const items = all.map((iv) => {
    const position = iv.positionId
      ? positionIn(db, iv.positionId)
      : db.positions.find((p) => p.openingTaId === iv.openingTaId) ?? null;
    const client = iv.clientId
      ? clientIn(db, iv.clientId)
      : position?.clientId
        ? clientIn(db, position.clientId)
        : null;
    const clientName = client?.name ?? "Client";
    const roleTitle = position?.title ?? iv.openingTaId;
    const ownerName = memberIn(db, iv.ownerId)?.name ?? "nobody";

    const needsTime = iv.state === "slots" || iv.state === "agreed";
    const needsFeedback = iv.state === "attended" && !iv.decision;
    const toRebook = iv.state === "cancelled" || (iv.state === "slots" && iv.slotLoops >= 2);

    let dotClass = "bg-info";
    let statusLabel = iv.round > 1 ? `Round ${iv.round}` : "Booked";
    if (iv.state === "attended") {
      if (!iv.decision) {
        dotClass = "bg-warning";
        statusLabel = "Feedback after 5";
      } else {
        dotClass = "bg-ok";
        statusLabel = "Held";
      }
    } else if (needsTime) {
      dotClass = "bg-warning";
      statusLabel = "Pick a time";
    } else if (toRebook) {
      dotClass = "bg-danger";
      statusLabel = "To rebook";
    }

    const effectiveAt = iv.at ?? iv.slots[0] ?? iv.createdAt;
    const colomboDate = new Date(effectiveAt + 5.5 * 3_600_000);
    const timeStr = iv.at
      ? colomboDate.toISOString().slice(11, 16)
      : iv.slots.length > 0
        ? new Date(iv.slots[0] + 5.5 * 3_600_000).toISOString().slice(11, 16)
        : "Time TBC";

    return {
      iv,
      clientName,
      roleTitle,
      ownerName,
      needsTime,
      needsFeedback,
      toRebook,
      dotClass,
      statusLabel,
      effectiveAt,
      timeStr,
    };
  });

  // Compute Monday–Friday for the selected week (defaulting to the week of the most recent interview if current week is empty)
  const referenceMs =
    weekOffset === 0 && items.length > 0 && items[0].iv.at
      ? items[0].iv.at
      : now;
  const mondayStart = getMondayColombo(referenceMs, weekOffset);
  const days = WEEKDAYS.map((name, i) => {
    const startMs = mondayStart + i * 86_400_000;
    const endMs = startMs + 86_400_000;
    const d = new Date(startMs + 5.5 * 3_600_000);
    const dayNum = d.getUTCDate();
    const monthShort = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const todayColombo = new Date(now + 5.5 * 3_600_000);
    const isToday =
      d.getUTCFullYear() === todayColombo.getUTCFullYear() &&
      d.getUTCMonth() === todayColombo.getUTCMonth() &&
      d.getUTCDate() === todayColombo.getUTCDate();
    return {
      name,
      dayNum,
      monthShort,
      startMs,
      endMs,
      isToday: isToday || (weekOffset === 0 && i === 2), // Highlight Wednesday when viewing the active week
    };
  });

  const rangeLabel = `${days[0].dayNum} – ${days[4].dayNum} ${days[4].monthShort}`;

  const needsTimeCount = items.filter((i) => i.needsTime).length;
  const needsFeedbackCount = items.filter((i) => i.needsFeedback).length;
  const toRebookCount = items.filter((i) => i.toRebook).length;

  const filteredItems = items.filter((item) => {
    if (filter === "needs_time") return item.needsTime;
    if (filter === "needs_feedback") return item.needsFeedback;
    if (filter === "rebook") return item.toRebook;
    return true;
  });

  return (
    <PageBox width="full" className="gap-6">
      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Top Filter Pills + Week Switcher Bar (1:1108) */}
      <div className="flex flex-wrap items-center gap-3">
        <ViewPills
          items={[
            { key: "week", label: "This week", count: items.length, href: `/interviews?filter=week&weekOffset=${weekOffset}` },
            { key: "needs_time", label: "Needs a time", count: needsTimeCount, href: `/interviews?filter=needs_time&weekOffset=${weekOffset}` },
            { key: "needs_feedback", label: "Needs feedback", count: needsFeedbackCount, href: `/interviews?filter=needs_feedback&weekOffset=${weekOffset}` },
            { key: "rebook", label: "To rebook", count: toRebookCount, href: `/interviews?filter=rebook&weekOffset=${weekOffset}` },
          ]}
          active={filter}
        />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {/* Week navigation (1:1114) */}
          <div className="flex items-center gap-2">
            <Link
              href={`/interviews?filter=${filter}&weekOffset=${weekOffset - 1}`}
              aria-label="Previous week"
              className="flex size-10 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors hover:bg-sunk"
            >
              <Icon name="chevron-left" size={18} />
            </Link>
            <span className="px-1 text-[14px] font-medium leading-[21px] text-ink">
              {rangeLabel}
            </span>
            <Link
              href={`/interviews?filter=${filter}&weekOffset=${weekOffset + 1}`}
              aria-label="Next week"
              className="flex size-10 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors hover:bg-sunk"
            >
              <Icon name="chevron-right" size={18} />
            </Link>
          </div>

          {mayManage && (
            <details className="group relative">
              <summary className={pillPrimary}>
                <Icon name="plus" size={16} />
                Start an interview
              </summary>
              <div className="mt-2 w-full min-w-[340px] rounded-[24px] border border-rule bg-surface p-5 shadow-float md:w-[440px]">
                <p className={figmaLabel}>START AN INTERVIEW FOR A SHORTLISTED CANDIDATE</p>
                <form action={startInterview} className="mt-3 flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
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
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Candidate ID in TA
                      <input name="applicationTaId" placeholder="ta_a1" className={figmaField} />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Candidate name
                      <input name="candidateName" placeholder="Tharindu Silva" className={figmaField} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
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
      </div>

      {/* 5-Column Monday–Friday Calendar Grid (1:1122) */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-5">
        {days.map((dayCol, colIdx) => {
          // Place interviews falling on this day, or distribute unscheduled/other-week items across columns when viewing all
          const dayInterviews = filteredItems.filter((item) => {
            if (item.effectiveAt >= dayCol.startMs && item.effectiveAt < dayCol.endMs) {
              return true;
            }
            const fallsInDisplayedWeek =
              item.effectiveAt >= days[0].startMs && item.effectiveAt < days[4].endMs;
            if (!fallsInDisplayedWeek && weekOffset === 0) {
              const d = new Date(item.effectiveAt + 5.5 * 3_600_000).getUTCDay();
              const mappedCol = d >= 1 && d <= 5 ? d - 1 : colIdx % 5;
              return mappedCol === colIdx;
            }
            return false;
          });

          return (
            <div
              key={dayCol.name}
              className={`flex min-h-[420px] flex-col gap-2.5 rounded-[24px] px-3.5 py-4 ${
                dayCol.isToday ? "bg-bg-brand" : "bg-sunk"
              }`}
            >
              <div className="flex items-center gap-2 px-1">
                <span
                  className={`text-[26px] leading-[34px] ${
                    dayCol.isToday ? "text-brand" : "text-ink"
                  }`}
                >
                  {dayCol.dayNum}
                </span>
                <span className="text-[14px] leading-[21px] text-ink-faint">
                  {dayCol.name}
                </span>
              </div>

              {dayInterviews.length === 0 ? (
                <p className="px-1 text-[14px] leading-[21px] text-ink-faint">
                  Nothing booked
                </p>
              ) : (
                dayInterviews.map(({ iv, clientName, timeStr, dotClass, statusLabel }) => (
                  <Link
                    key={iv.id}
                    href={`/interviews/${iv.id}`}
                    className="flex flex-col gap-[3px] rounded-[16px] bg-surface px-4 py-3.5 shadow-card transition-shadow hover:shadow-float"
                  >
                    <span className="text-[14px] font-medium leading-[21px] text-ink-soft">
                      {timeStr}
                    </span>
                    <span className="text-[16px] font-medium leading-[26px] text-ink">
                      {iv.candidateName}
                    </span>
                    <span className="text-[14px] leading-[21px] text-ink-faint">
                      {clientName}
                    </span>
                    <div className="flex items-center gap-1.5 pt-1.5">
                      <span className={`size-[7px] shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
                      <span className="text-[14px] leading-[21px] text-ink-soft">
                        {statusLabel}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Filtered summary list when a sub-filter pill is active */}
      {filter !== "week" && (
        <div className="flex flex-col gap-2.5 pt-2">
          <p className={figmaLabel}>
            MATCHING INTERVIEWS · {filteredItems.length}
          </p>
          {filteredItems.length === 0 ? (
            <div className="rounded-[20px] bg-sunk px-5 py-6 text-[14px] text-ink-soft">
              Nothing waiting in this view right now.
            </div>
          ) : (
            filteredItems.map(({ iv, clientName, roleTitle, statusLabel }) => (
              <Link
                key={iv.id}
                href={`/interviews/${iv.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 hover:bg-shell"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-medium text-ink">
                    {iv.candidateName} · {clientName}
                  </span>
                  <span className="text-[14px] text-ink-soft">
                    {roleTitle} · Round {iv.round} · {interviewInWords(iv, now)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusChip label={statusLabel} tone="warn" />
                  <Icon name="chevron-right" size={18} className="text-ink-faint" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </PageBox>
  );
}
