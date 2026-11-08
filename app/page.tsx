import Link from "next/link";
import { redirect } from "next/navigation";

import { isRoutine, messageInWords, messageTitle } from "@/lib/messages";
import { approveAllRoutine, approveAndSend } from "@/app/actions";
import { aiSwitches, dayItems, desk, draftsWaiting, liveTimersFor, openTasksFor, runClocks, templateFor, whyFirstKept } from "@/data/desk";
import AiOffer from "@/app/AiOffer";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { KEYS_IN_WORDS } from "@/lib/keys";
import { firstBecause, whatFirst, whatFirstKey } from "@/lib/whatFirst";
import { colomboDate, DAY } from "@/lib/calendar";
import { clockInWords, timeLeft } from "@/lib/timers";
import { currentMember } from "@/lib/session";
import { NAV } from "@/lib/nav";
import { workByPage, workInWords } from "@/lib/sectionWork";
import { explainFirst, runClocksNow, startTestClock } from "./actions";

/**
 * Your day: the only screen an Ops person starts on (07, "inbox first").
 *
 * Four parts, in the order the work matters: what needs approving, what is due
 * today, what is late, and which clock is running out. Every row opens its own
 * page; nothing opens over the top of this one.
 */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;

  // The clocks run on every visit, so a deadline never waits for someone to
  // press something. A real schedule replaces this when the crons land.
  await runClocks();

  const now = Date.now();
  const db = await desk();
  const drafts = draftsWaiting(db);
  // The ones the "approve all" button may take: the owner's rule, in one place.
  const routine = drafts.filter((m) => isRoutine(m, m.templateKey ? templateFor(db, m.templateKey) : null));
  const tasks = openTasksFor(db, member.id);
  const due = tasks.filter((t) => t.dueAt >= now && t.dueAt < now + DAY);
  const late = tasks.filter((t) => t.dueAt < now);
  const clocks = liveTimersFor(db, member.id);
  const work = workByPage(tasks, now);

  // What to do first (8 Nov, UX order 6). The rules choose; the model, when
  // it is on and has been asked once today, says why in one line.
  const first = whatFirst(dayItems(db, member.id, now));
  const firstKey = first ? whatFirstKey(member.id, colomboDate(now), first.first) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);
  const aiLine = firstKey ? whyFirstKept(db, firstKey) : null;

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-medium">Your day</h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {colomboDate(now)} · Colombo<span className="hidden md:inline"> · {KEYS_IN_WORDS}</span>
          </p>
        </div>
        {/* Desk tools: a phone has no business running the clocks by hand. */}
        <div className="hidden flex-wrap gap-2 md:flex">
          <form action={runClocksNow}>
            <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              Run the clocks now
            </button>
          </form>
          <form action={startTestClock}>
            <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              Start a two-hour test clock
            </button>
          </form>
        </div>
      </div>

      {msg && (
        <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>
      )}

      {/*
        First today. One thing, chosen by the rules in src/lib/whatFirst.ts,
        so a broken model can never change what is urgent. The AI's part is
        the one line under it, written once a day when a person asks.
      */}
      <section className="rounded-2xl border border-brand/30 bg-surface px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">First today</p>
        {first ? (
          <>
            <Link href={first.first.href} className="mt-1 block text-[16px] font-medium text-ink hover:text-brand">
              {first.first.said}
            </Link>
            <p className="mt-1 text-[13px] text-ink-soft">{aiLine ?? firstBecause(first.first, first.others)}</p>
            {aiOn && !aiLine && (
              <form action={explainFirst} className="mt-2">
                <button className="rounded-full border border-rule-strong px-3 py-1 text-[12.5px] hover:bg-paper active:scale-[0.98]">
                  Ask the AI why this first
                </button>
              </form>
            )}
            {!aiOn && <AiOffer label="Ask the AI why this first" why={whyAiOff ?? ""} />}
          </>
        ) : (
          <p className="mt-1 text-[15px]">Nothing is waiting on you. The day is clear.</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["To approve", drafts.length, ""],
          ["Due today", due.length, ""],
          ["Late", late.length, late.length ? "text-danger" : ""],
          ["Clocks", clocks.length, clocks.length ? "text-warning" : ""],
        ].map(([label, count, tone]) => (
          <div key={String(label)} className="rounded-xl bg-surface px-4 py-3">
            <p className="text-[12.5px] text-ink-soft">{label}</p>
            <p className={"mt-1 text-[22px] font-medium " + String(tone)}>{count}</p>
          </div>
        ))}
      </div>

      {/*
        Where the work is, section by section (24, section 4). The same count
        the header shows, from the same rule, so the two can never disagree.
        It is here because a person who opens the app should be able to read
        one screen and know where to go, without opening anything.
      */}
      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Where your work is</h2>
        <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
          {NAV.map((section) => {
            const count = work[section.key];
            return (
              <Link
                key={section.key}
                href={(section.pages.find((page) => (work[page.href]?.waiting ?? 0) > 0) ?? section.pages[0]).href}
                className="flex items-baseline gap-3 border-t border-rule py-2.5 hover:bg-paper"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-[13.5px]">{section.what}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-soft">{section.about}</span>
                </span>
                <span
                  className={
                    "whitespace-nowrap text-[12.5px] " +
                    (count?.late ? "text-danger" : count?.waiting ? "text-ink" : "text-ink-faint")
                  }
                >
                  {workInWords(count)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/*
        The three lists side by side (6 Nov).
        
        They were stacked, so "waiting for your approval" filled the screen
        and "due today" and "late" were below the fold - an ops person opening
        the app saw one of the three things they came to see. A desk screen is
        wide, so they go across it, and each one scrolls inside itself rather
        than pushing the other two down.
      */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:[&>section]:max-h-[46vh]">
      <section className={card + " flex min-w-0 flex-col"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[14.5px] font-medium">Waiting for your approval</h2>
          {/*
            Every routine notice at once (7 Nov, UX order 2). Only the drafts
            whose template a person approved once; it says so when there are
            none, rather than showing a button that does nothing.
          */}
          {drafts.length > 0 && (
            <form action={approveAllRoutine}>
              <input type="hidden" name="back" value="/" />
              <button
                className={
                  routine.length
                    ? "rounded-full bg-brand px-3 py-1 text-[12.5px] font-medium text-white hover:bg-brand-strong active:scale-[0.98]"
                    : "rounded-full border border-rule px-3 py-1 text-[12.5px] text-ink-faint"
                }
                title={
                  routine.length
                    ? "Sends every draft made from a template somebody approved once. Nothing hand-written."
                    : "None of these is a routine notice: each needs a person to read it."
                }
              >
                {routine.length ? "Approve all " + routine.length + " routine" : "No routine notices"}
              </button>
            </form>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing is waiting.</p>}
        {/*
          Read it here, approve it here (7 Nov, UX order 2). Nineteen drafts
          was thirty-eight clicks: open, read, approve, back. The body is a
          `details` under the title - shut, so the list stays a list, and open
          with one click when the title is not enough. Approve posts the same
          action as the message's own page, through the same gate, and comes
          back here. "Open" is still there for anyone who wants to change it.
        */}
        {drafts.map((message) => (
          <div key={message.id} data-row tabIndex={-1} className={row + " rounded-lg outline-none focus:bg-sunk focus:ring-1 focus:ring-brand/40"}>
            <details className="min-w-0 flex-1 group">
              <summary className="cursor-pointer list-none">
                <p className="text-[13.5px] group-open:font-medium">{messageTitle(message)}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{messageInWords(message)}</p>
              </summary>
              <pre className="mt-2 max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-sunk px-3 py-2 font-[inherit] text-[12.5px] leading-relaxed text-ink">
                {message.body}
              </pre>
            </details>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={"/messages/" + message.id}
                data-open
                className="text-[12.5px] text-ink-soft hover:text-ink hover:underline"
              >
                Open
              </Link>
              <form action={approveAndSend}>
                <input type="hidden" name="messageId" value={message.id} />
                <input type="hidden" name="back" value="/" />
                <button data-approve className="rounded-full bg-brand px-3 py-1 text-[12.5px] font-medium text-white hover:bg-brand-strong active:scale-[0.98]">
                  {message.channel === "group_post" ? "Approve" : "Approve and send"}
                </button>
              </form>
            </div>
          </div>
        ))}
        </div>
      </section>

        <section className={card + " flex min-w-0 flex-col"}>
          <h2 className="text-[14.5px] font-medium">Due today</h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
          {due.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing due today.</p>}
          {due.map((task) => (
            <div key={task.id} data-row tabIndex={-1} className={row + " rounded-lg outline-none focus:bg-sunk focus:ring-1 focus:ring-brand/40"}>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">{task.title}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{timeLeft(task.dueAt, now).text}</p>
              </div>
              <Link href={"/tasks/" + task.id} data-open className="text-[12.5px] text-brand hover:underline">
                Open
              </Link>
            </div>
          ))}
          </div>
        </section>

        <section className={card + " flex min-w-0 flex-col"}>
          <h2 className="text-[14.5px] font-medium">Late, and clocks</h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
          {late.length === 0 && clocks.length === 0 && (
            <p className="mt-2 text-[13px] text-ink-soft">Nothing late, nothing running out.</p>
          )}
          {late.map((task) => (
            <div key={task.id} data-row tabIndex={-1} className={row + " rounded-lg outline-none focus:bg-sunk focus:ring-1 focus:ring-brand/40"}>
              <span className="rounded-full bg-bg-danger px-2 py-0.5 text-[11.5px] text-danger">
                {timeLeft(task.dueAt, now).text}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">{task.title}</p>
              </div>
              <Link href={"/tasks/" + task.id} data-open className="text-[12.5px] text-brand hover:underline">
                Open
              </Link>
            </div>
          ))}
          {clocks.map((timer) => {
            const left = timeLeft(timer.dueAt, now);
            return (
              <div key={timer.id} className={row}>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11.5px] " +
                    (left.tone === "late"
                      ? "bg-bg-danger text-danger"
                      : left.tone === "soon"
                        ? "bg-bg-warning text-warning"
                        : "bg-bg-ok text-ink-soft")
                  }
                >
                  {left.text}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px]">{timer.payload.label ?? timer.kind}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{clockInWords(timer.kind)}</p>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      </div>
    </div>
  );
}
