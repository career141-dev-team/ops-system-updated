import Link from "next/link";

import { Avatar, Card, EmptyState } from "@/app/ui/figma";
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";
import { ROUND_DECISIONS, slotAnswerFor } from "@/lib/interviews";
import { panelHref } from "@/lib/panel";
import { sendHref } from "@/lib/sendModal";
import {
  COLUMN_TITLES,
  type BoardColumn,
  columnOf,
  dayWords,
  ordinalRound,
  reconfirmNote,
  slotWords,
  timesThatFit,
} from "@/lib/roleInterviews";

import type { TabProps } from "./ctx";
import InterviewPanel, { INTERVIEW_PANELS } from "./interviews/panels";

const DOT: Record<BoardColumn, string> = { needs: "bg-warn", booked: "bg-info", waiting: "bg-brand", done: "bg-ink-3" };
const small = "inline-flex items-center rounded-full px-3 py-[7px] t-label";
const solid = small + " bg-ink text-ink-inverse";
const line = small + " border border-rule bg-surface text-ink hover:bg-sunk";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The role page's Interviews tab (v6 R1): the board, the rail, and the six panels that open over it. */
export default function Interviews({ c, sp }: TabProps) {
  const { itsInterviews, position, now } = c;
  const path = `/positions/${position.id}`;
  const open = (panel: string, on?: string) => panelHref(path, sp, panel, on);
  const columns: Record<BoardColumn, typeof itsInterviews> = { needs: [], booked: [], waiting: [], done: [] };
  for (const iv of itsInterviews) columns[columnOf(iv)].push(iv);

  const moved = itsInterviews.flatMap((iv) => (iv.reschedules ?? []).map((m) => ({ iv, m }))).sort((a, b) => b.m.at - a.m.at)[0] ?? null;
  const needing = columns.needs.length;

  // This week, Monday to Sunday in Colombo.
  const dayOf = (at: number) => Math.floor((at + COLOMBO_OFFSET_MS) / DAY);
  const today = dayOf(now);
  const monday = today - ((new Date(now + COLOMBO_OFFSET_MS).getUTCDay() + 6) % 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => monday + i);
  const thisWeek = columns.booked
    .filter((iv) => iv.at !== null && dayOf(iv.at) >= monday && dayOf(iv.at) <= monday + 6)
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  return (
    <>
      <div className="flex items-start gap-[22px] max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px] max-lg:w-full">
          <Card
            title="Interviews"
            sub="You agree a time with the client and the candidate, then book it here."
            right={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link scroll={false} href={open("find-a-time")} className={solid}>
                  Book an interview
                </Link>
                <Link scroll={false} href={sendHref(path, sp, "book-interview", c.liveIv?.id)} className={line}>
                  Preview &amp; book
                </Link>
                <Link scroll={false} href={sendHref(path, sp, "reconfirm", c.liveIv?.id)} className={line}>
                  Preview reconfirm
                </Link>
                <Link scroll={false} href={sendHref(path, sp, "candidate-feedback", c.liveIv?.id)} className={line}>
                  Preview feedback
                </Link>
                <Link scroll={false} href={open("candidate-feedback")} className={line}>
                  Candidate feedback
                </Link>
                <Link scroll={false} href={open("client-books-directly")} className={line}>
                  Client books directly
                </Link>
                <Link scroll={false} href={open("reference-check")} className={line}>
                  Reference check
                </Link>
              </div>
            }
          >
            {itsInterviews.length === 0 ? (
              <EmptyState icon="calendar" title="Nobody has been interviewed yet">
                An interview appears here when the client shortlists somebody from a CV set.
              </EmptyState>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
                {(Object.keys(columns) as BoardColumn[]).map((col) => {
                  const rows = columns[col];
                  const shown = col === "done" ? rows.slice(0, 4) : rows;
                  return (
                    <div key={col} className="flex flex-col gap-2.5 rounded-[20px] bg-sunk px-3 py-3.5">
                      <div className="flex items-center gap-2 px-1 pb-0.5">
                        <span className={"size-2 rounded-[4px] " + DOT[col]} />
                        <span className="t-body-m flex-1">{COLUMN_TITLES[col]}</span>
                        <span className="t-small text-ink-3">{rows.length}</span>
                      </div>
                      {rows.length === 0 && <p className="t-small rounded-[14px] border border-rule p-3.5 text-ink-3">None now</p>}
                      {shown.map((iv) => (
                        <BoardCard key={iv.id} iv={iv} col={col} now={now} open={open} />
                      ))}
                      {rows.length > shown.length && <p className="t-small px-1 text-ink-3">{rows.length - shown.length} more</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {moved && (
              <p className="t-small text-ink-3">
                Moved once: {moved.iv.candidateName.split(" ")[0]}, {slotWords(moved.m.from)} to {slotWords(moved.m.to)} ({moved.m.reason}).
              </p>
            )}
          </Card>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-5 max-lg:w-full">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6 text-ink-inverse">
            <p className="t-micro text-ink-3">WHERE IT STANDS</p>
            <p className="t-h2">{needing ? `${needing} ${needing === 1 ? "interview needs" : "interviews need"} a time.` : c.step.where + "."}</p>
            <p className="t-small text-ink-3">{c.step.waiting}</p>
          </section>

          <Card className="!gap-3 !px-6 !py-[22px]">
            <p className="t-micro text-ink-3">THIS WEEK</p>
            <div className="flex gap-1.5">
              {weekDays.map((d) => {
                const date = new Date(d * DAY);
                const has = thisWeek.some((iv) => iv.at !== null && dayOf(iv.at) === d);
                const lit = d === today || has;
                return (
                  <div key={d} className={"flex w-[47px] flex-col items-center gap-0.5 rounded-[12px] py-2 " + (lit ? "bg-bg-brand" : "border border-rule")}>
                    <span className="t-micro text-ink-3">{WEEKDAYS[date.getUTCDay()]}</span>
                    <span className={"t-body-m " + (lit ? "text-brand" : "")}>{date.getUTCDate()}</span>
                    {has && <span className="size-[5px] rounded-[3px] bg-brand" />}
                  </div>
                );
              })}
            </div>
            {thisWeek.map((iv) => (
              <div key={iv.id} className="flex gap-3 rounded-[12px] bg-info-soft px-3 py-2.5">
                <span className="w-[3px] self-stretch rounded-[2px] bg-info" />
                <span className="t-small w-[72px] text-info">{slotWords(iv.at as number).replace(",", "")}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="t-body-m">{iv.candidateName}</span>
                  <span className="t-small text-ink-3">
                    {ordinalRound(iv.round)}
                    {iv.whereOrLink ? " · " + iv.whereOrLink : ""}
                  </span>
                </span>
              </div>
            ))}
            {columns.needs.map((iv) => {
              const fit = timesThatFit(iv);
              return (
                <div key={iv.id} className="flex gap-3 rounded-[12px] bg-warn-soft px-3 py-2.5">
                  <span className="w-[3px] self-stretch rounded-[2px] bg-warn" />
                  <span className="t-small w-[72px] text-warn">Not booked</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="t-body-m">{iv.candidateName}</span>
                    <span className="t-small text-ink-3">
                      {fit.length ? fit.map(slotWords).join(" or ") + " fit both" : iv.slots.length ? iv.slots.length + " times offered" : "No times yet"}
                    </span>
                  </span>
                </div>
              );
            })}
            {thisWeek.length === 0 && columns.needs.length === 0 && <p className="t-small text-ink-3">Nothing booked this week.</p>}
          </Card>
        </div>
      </div>

      {INTERVIEW_PANELS.includes(sp.panel as (typeof INTERVIEW_PANELS)[number]) && <InterviewPanel c={c} sp={sp} />}
    </>
  );
}

function BoardCard({ iv, col, now, open }: { iv: TabProps["c"]["itsInterviews"][number]; col: BoardColumn; now: number; open: (panel: string, on?: string) => string }) {
  const first = iv.candidateName.split(" ")[0];
  const fit = timesThatFit(iv);
  const sub =
    col === "booked" && iv.at ? `${ordinalRound(iv.round)} · ${slotWords(iv.at)}` : col === "done" && iv.at ? `${ordinalRound(iv.round)} · ${dayWords(iv.at)}` : ordinalRound(iv.round);
  const note =
    col === "needs"
      ? fit.length
        ? `${fit.length} ${fit.length === 1 ? "time fits" : "times fit"} both`
        : iv.slots.length
          ? `${iv.slots.filter((at) => slotAnswerFor(iv, at) === null).length} of ${iv.slots.length} times not asked yet`
          : iv.scheduler === "client"
            ? "The client books this one"
            : "No times from the client yet"
      : col === "booked"
        ? (reconfirmNote(iv, now) ?? (iv.state === "reconfirmed" ? "Reconfirmed" : ""))
        : col === "waiting"
          ? "Held, the client has not decided"
          : iv.decision
            ? (ROUND_DECISIONS[iv.decision] ?? iv.decision)
            : iv.state === "cancelled"
              ? "Cancelled"
              : iv.state === "no_show"
                ? "Nobody came"
                : "";
  const noteTone = col === "needs" && fit.length ? "text-brand" : note.startsWith("Reconfirm ") ? "text-warn" : "text-ink-3";
  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={iv.candidateName} size="32" tone={col === "needs" ? "warn" : col === "booked" ? "info" : "neutral"} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="t-body-m truncate">{iv.candidateName}</span>
          <span className="t-small truncate text-ink-3">{sub}</span>
        </span>
      </div>
      {note && <p className={"t-small " + noteTone}>{note}</p>}
      <div className="flex flex-wrap gap-2">
        {col === "needs" && (
          <Link scroll={false} href={open(iv.scheduler === "client" ? "client-books-directly" : "find-a-time", iv.id)} className={solid}>
            {iv.scheduler === "client" ? "Record their date" : "Find a time"}
          </Link>
        )}
        {col === "booked" && (
          <>
            <Link scroll={false} href={open("reconfirm", iv.id)} className={line}>
              Reconfirm
            </Link>
            {iv.at !== null && iv.at < now && (
              <Link scroll={false} href={open("add-result", iv.id)} className={solid}>
                Add the result
              </Link>
            )}
          </>
        )}
        {col === "waiting" && (
          <Link scroll={false} href={open("add-result", iv.id)} className={solid}>
            Add the result
          </Link>
        )}
        {col === "done" && !iv.candidateFeedback && iv.state === "attended" && (
          <Link scroll={false} href={open("candidate-feedback", iv.id)} className={line}>
            {first}&apos;s feedback
          </Link>
        )}
      </div>
    </div>
  );
}
