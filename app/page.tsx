import Link from "next/link";
import { redirect } from "next/navigation";

import AuraComposer from "@/app/AuraComposer";
import Icon from "@/app/Icon";
import { isRoutine, messageInWords, messageTitle } from "@/lib/messages";
import { approveAllRoutine, approveAndSend } from "@/app/actions";
import { aiSwitches, dayItems, desk, draftsWaiting, liveTimersFor, runClocks, templateFor, whyFirstKept } from "@/data/desk";
import type { OpsDatabase } from "@/data/types";
import { anyKeySet } from "@/lib/ai";
import { testToolsShown } from "@/lib/clockPass";
import { firstBecause, orderTheDay, whatFirstKey, type DayItem } from "@/lib/whatFirst";
import { colomboDate } from "@/lib/calendar";
import { clockInWords, timeLeft } from "@/lib/timers";
import { currentMember } from "@/lib/session";
import { seesWholeDesk } from "@/lib/roles";
import {
  dayInWords,
  doneToday,
  firstName,
  greetingFor,
  laterLast,
  rowIcon,
  rowLabel,
  summaryLine,
} from "@/lib/myWork";
import { explainFirst, runClocksNow, startTestClock } from "./actions";

/**
 * My Work: the only screen an Ops person starts on (13 Nov, the approved
 * Figma "MW · My Work — one thing at a time"; "Your day" before it).
 *
 * One thing at a time. The rules in src/lib/whatFirst.ts choose what is up
 * next, so a broken model can never change what is urgent; the next four
 * follow, and everything else is one click away. Three views in pills, as
 * links, so the page holds no state of its own: Today, To approve, Messages.
 * Every row opens its own page; nothing opens over the top of this one.
 */

type View = "today" | "approve" | "messages";

/** Who a task or a draft is about, by name: the client line on the card. */
function aboutWhom(db: OpsDatabase, type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  if (type === "lead") return db.leads.find((l) => l.id === id)?.company ?? null;
  if (type === "client") return db.clients.find((c) => c.id === id)?.name ?? null;
  if (type === "clientSet") return db.clientSets.find((s) => s.id === id)?.name.split(">")[0]?.trim() || null;
  return null;
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; view?: string; later?: string; all?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const params = await searchParams;
  const view: View = params.view === "approve" || params.view === "messages" ? params.view : "today";
  const later = (params.later ?? "").split(",").filter(Boolean);

  // The clocks run on every visit, so a deadline never waits for someone to
  // press something. The scheduler runs them every five minutes as well.
  await runClocks();

  const now = Date.now();
  const db = await desk();
  const drafts = draftsWaiting(db);
  const routine = drafts.filter((m) => isRoutine(m, m.templateKey ? templateFor(db, m.templateKey) : null));
  const clocks = liveTimersFor(db, member.id);

  // Mail nobody has dealt with, each email once: the whole desk for the ops
  // lead and the Director, the person's own box for everybody else (9 Nov).
  const wholeDesk = seesWholeDesk(member);
  const mail = [
    ...new Map(
      db.inbound
        .filter((i) => i.readState === "new" && (wholeDesk || i.mailbox.toLowerCase() === member.email.toLowerCase()))
        .map((i) => [i.from + "|" + i.subject + "|" + i.receivedAt, i]),
    ).values(),
  ].sort((a, b) => b.receivedAt - a.receivedAt);

  // The day, in the rules' order, with what was put off for later at the end.
  const items = laterLast(orderTheDay(dayItems(db, member.id, now)), later);
  const [first, ...others] = items;
  const late = items.filter((i) => i.kind === "late").length;
  const done = doneToday(db.tasks, member.id, now);
  const total = done + items.length;

  const firstKey = first ? whatFirstKey(member.id, colomboDate(now), first) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const aiLine = firstKey ? whyFirstKept(db, firstKey) : null;

  // What the first thing is, behind its one line.
  const firstTask = first?.href.startsWith("/tasks/") ? db.tasks.find((t) => t.id === first.href.slice(7)) : undefined;
  const firstDraft = first?.href.startsWith("/messages/") ? db.messages.find((m) => m.id === first.href.slice(10)) : undefined;
  const who = firstTask
    ? aboutWhom(db, firstTask.subjectType, firstTask.subjectId)
    : firstDraft
      ? aboutWhom(db, firstDraft.subjectType, firstDraft.subjectId)
      : null;
  const [title, detail] = firstDraft ? [messageTitle(firstDraft), messageInWords(firstDraft)] : [first?.said ?? "", null];
  // The verb on the one button (Figma: "Labels are verbs").
  const verb = firstTask
    ? ({ call: "Make the call", record: "Write it down", decide: "Decide", approve: "Approve", check: "Check it" } as Record<string, string>)[firstTask.kind] ?? "Open"
    : first?.kind === "mail"
      ? "Read the mail"
      : "Open";

  const href = (v: View, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ ...(v === "today" ? {} : { view: v }), ...(later.length ? { later: later.join(",") } : {}), ...extra });
    const s = q.toString();
    return "/" + (s ? "?" + s : "");
  };
  const laterHref = first
    ? "/?" + new URLSearchParams({ later: [...later.filter((h) => h !== first.href), first.href].join(",") }).toString()
    : "/";

  const tabs: { key: View; what: string; count: number }[] = [
    { key: "today", what: "Today", count: items.length },
    { key: "approve", what: "To approve", count: drafts.length },
    { key: "messages", what: "Messages", count: mail.length },
  ];

  const row = "group flex items-center gap-3.5 rounded-xl px-2 py-1 outline-none transition-colors hover:bg-sunk focus:bg-sunk";
  const caption = "text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint";

  const dayRow = (item: DayItem) => {
    const label = rowLabel(item, now);
    return (
      <Link key={item.href + item.at} href={item.href} data-row data-open tabIndex={-1} className={row}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft group-hover:bg-surface">
          <Icon name={rowIcon(item)} size={17} />
        </span>
        <span className="min-w-0 flex-1 truncate py-[9px] text-[16px] leading-[26px] text-ink">{item.said}</span>
        <span className={"shrink-0 text-[14px] leading-[21px] " + (label.late ? "text-danger" : "text-ink-faint")}>{label.text}</span>
      </Link>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-sheet bg-surface px-4 pb-10 pt-8 shadow-card md:px-10">
      {/* The aurora: a soft light behind the greeting, drawn in CSS, not an image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[60px] h-[420px] w-[900px] max-w-full -translate-x-1/2 rounded-full opacity-70 blur-[60px]"
        style={{
          background:
            "radial-gradient(closest-side at 35% 45%, rgba(196,181,253,0.55), transparent 70%), radial-gradient(closest-side at 65% 55%, rgba(153,246,228,0.55), transparent 70%), radial-gradient(closest-side at 80% 40%, rgba(187,247,208,0.5), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[820px] flex-col">
        {/* The three views: one row of pills with counts, never a second menu (Figma "View pill"). */}
        <nav aria-label="Views" className="flex items-center justify-center gap-0.5">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={href(tab.key)}
              aria-current={view === tab.key ? "page" : undefined}
              className={
                "flex items-center gap-2 rounded-full px-4 py-[9px] text-[14px] leading-[21px] transition-colors " +
                (view === tab.key ? "bg-sunk text-ink" : "text-ink-soft hover:text-ink")
              }
            >
              {tab.what}
              <span className="text-ink-faint">{tab.count}</span>
            </Link>
          ))}
        </nav>

        <header className="mt-1 flex flex-col items-center gap-1 text-center">
          <p className="text-[14px] leading-[21px] text-ink-faint">{dayInWords(now)}</p>
          <h1 className="text-[40px] font-light leading-[50px] text-ink md:text-[56px] md:leading-[66px]">
            {greetingFor(now)}, {firstName(member.name)}
          </h1>
          <p className="text-[16px] leading-[26px] text-ink-soft">{summaryLine(items.length, late)}</p>
          {total > 0 && (
            <div className="flex items-center gap-1.5 pt-3" aria-label={done + " of " + total + " done"}>
              {Array.from({ length: Math.min(total, 12) }, (_, i) => (
                <span key={i} className={"h-1 w-9 rounded-[2px] " + (i < Math.round((done / total) * Math.min(total, 12)) ? "bg-brand" : "bg-shell")} />
              ))}
              <span className="ml-0.5 text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                {done} of {total} done
              </span>
            </div>
          )}
        </header>

        {params.msg && (
          <p className="mt-6 rounded-panel border border-rule bg-surface px-4 py-2.5 text-[14px]">{params.msg}</p>
        )}

        {view === "today" && (
          <>
            {/* Up next: one thing, and the one move that settles it. */}
            <section className="mt-6 flex flex-col gap-4 rounded-[28px] bg-surface px-7 pb-5 pt-7 shadow-float">
              {first ? (
                <>
                  <div className="flex items-center">
                    <p className={caption + " flex-1"}>Up next</p>
                    {(first.kind === "late" || (first.kind === "clock" && first.at < now)) && (
                      <span className="flex items-center gap-1.5 rounded-full bg-bg-danger px-2.5 py-1 text-[14px] font-medium leading-[21px] text-danger">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-danger" />
                        {rowLabel(first, now).text}
                      </span>
                    )}
                  </div>
                  {who && <p className="text-[14px] leading-[21px] text-ink-faint">{who}</p>}
                  <h2 className="text-[22px] leading-[30px] text-ink md:text-[26px] md:leading-[34px]">{title}</h2>
                  <p className="text-[16px] leading-[26px] text-ink-soft">
                    {detail ? detail + " " : ""}
                    {aiLine ?? firstBecause(first, others)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-2.5">
                    {firstDraft ? (
                      <form action={approveAndSend}>
                        <input type="hidden" name="messageId" value={firstDraft.id} />
                        <input type="hidden" name="back" value="/" />
                        <button className="rounded-full bg-ink px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink-inverse active:scale-[0.98]">
                          {firstDraft.channel === "group_post" ? "Approve" : "Approve and send"}
                        </button>
                      </form>
                    ) : (
                      <Link href={first.href} className="rounded-full bg-ink px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink-inverse active:scale-[0.98]">
                        {verb}
                      </Link>
                    )}
                    {firstDraft && (
                      <Link href={first.href} className="rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink hover:bg-sunk">
                        Read it first
                      </Link>
                    )}
                    {aiOn && !aiLine && (
                      <form action={explainFirst}>
                        <button className="rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink hover:bg-sunk">
                          Ask AURA why this first
                        </button>
                      </form>
                    )}
                    <span className="flex-1" />
                    {others.length > 0 && (
                      <Link href={laterHref} className="rounded-full px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink-soft hover:text-ink">
                        Later
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className={caption}>Up next</p>
                  <h2 className="text-[26px] leading-[34px] text-ink">Nothing is waiting on you.</h2>
                  <p className="text-[16px] leading-[26px] text-ink-soft">A new task, a draft or an email will appear here first.</p>
                </>
              )}
            </section>

            {/* Then: the next four, and the rest one click away. */}
            {others.length > 0 && (
              <section className="mt-6 flex flex-col gap-1">
                <div className="flex items-center px-2">
                  <p className={caption + " flex-1"}>{params.all ? "Everything today" : "Then"}</p>
                  {params.all ? (
                    <Link href={href("today")} className={caption + " hover:text-ink"}>Show fewer</Link>
                  ) : (
                    others.length > 4 && <Link href={href("today", { all: "1" })} className={caption + " hover:text-ink"}>See all {items.length}</Link>
                  )}
                </div>
                {(params.all ? others : others.slice(0, 4)).map(dayRow)}
              </section>
            )}

            {/* Every clock running for you, beyond today too: the old day page's list. */}
            {params.all && clocks.length > 0 && (
              <section className="mt-6 flex flex-col gap-1">
                <p className={caption + " px-2"}>Clocks running</p>
                {clocks.map((timer) => {
                  const left = timeLeft(timer.dueAt, now);
                  return (
                    <div key={timer.id} className="flex items-center gap-3.5 px-2 py-1">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                        <Icon name="calendar" size={17} />
                      </span>
                      <span className="min-w-0 flex-1 py-[9px]">
                        <span className="block truncate text-[16px] leading-[26px]">{timer.payload.label ?? timer.kind}</span>
                        <span className="block text-[13px] text-ink-faint">{clockInWords(timer.kind)}</span>
                      </span>
                      <span className={"shrink-0 text-[14px] " + (left.tone === "late" ? "text-danger" : "text-ink-faint")}>{left.text}</span>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {view === "approve" && (
          <section className="mt-6 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 px-2">
              <p className={caption + " flex-1"}>Waiting for your approval</p>
              {/* Every routine notice at once (7 Nov, UX order 2): only drafts from a template a person approved once. */}
              {drafts.length > 0 && (
                <form action={approveAllRoutine}>
                  <input type="hidden" name="back" value="/?view=approve" />
                  <button
                    disabled={!routine.length}
                    title={
                      routine.length
                        ? "Sends every draft made from a template somebody approved once. Nothing hand-written."
                        : "None of these is a routine notice: each needs a person to read it."
                    }
                    className={
                      routine.length
                        ? "rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-ink-inverse active:scale-[0.98]"
                        : "rounded-full border border-rule px-4 py-2 text-[14px] text-ink-faint"
                    }
                  >
                    {routine.length ? "Approve all " + routine.length + " routine" : "No routine notices"}
                  </button>
                </form>
              )}
            </div>
            {drafts.length === 0 && <p className="px-2 text-[16px] text-ink-soft">Nothing is waiting for your approval.</p>}
            {/* Read it here, approve it here (7 Nov, UX order 2): the body under the title, shut until asked. */}
            {drafts.map((message) => (
              <div key={message.id} data-row tabIndex={-1} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-t border-rule px-2 py-3 outline-none first-of-type:border-t-0 focus:bg-sunk">
                <details className="group min-w-0 basis-full">
                  <summary className="cursor-pointer list-none">
                    <p className="text-[16px] leading-[26px] group-open:font-medium">{messageTitle(message)}</p>
                    <p className="text-[14px] text-ink-soft">{messageInWords(message)}</p>
                  </summary>
                  <pre className="mt-2 max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-sunk px-3 py-2 font-[inherit] text-[13px] leading-relaxed text-ink">
                    {message.body}
                  </pre>
                </details>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Link href={"/messages/" + message.id} data-open className="text-[14px] text-ink-soft hover:text-ink hover:underline">
                    Open
                  </Link>
                  <form action={approveAndSend}>
                    <input type="hidden" name="messageId" value={message.id} />
                    <input type="hidden" name="back" value="/?view=approve" />
                    <button data-approve className="rounded-full bg-ink px-4 py-1.5 text-[14px] font-medium text-ink-inverse active:scale-[0.98]">
                      {message.channel === "group_post" ? "Approve" : "Approve and send"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </section>
        )}

        {view === "messages" && (
          <section className="mt-6 flex flex-col gap-1">
            <div className="flex items-center px-2">
              <p className={caption + " flex-1"}>{wholeDesk ? "Waiting for an answer, the whole desk" : "Waiting for an answer, your mailbox"}</p>
              <Link href={wholeDesk ? "/mail?box=all" : "/mail?box=mine"} className={caption + " hover:text-ink"}>
                Open the inbox
              </Link>
            </div>
            {mail.length === 0 && <p className="px-2 text-[16px] text-ink-soft">Nobody is waiting for an answer.</p>}
            {mail.slice(0, 20).map((m) => (
              <Link key={m.id} href={wholeDesk ? "/mail?box=all" : "/mail?box=mine"} data-row data-open tabIndex={-1} className={row}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft group-hover:bg-surface">
                  <Icon name="mail" size={17} />
                </span>
                <span className="min-w-0 flex-1 py-[9px]">
                  <span className="block truncate text-[16px] leading-[26px] text-ink">{m.subject || "(no subject)"}</span>
                  <span className="block truncate text-[13px] text-ink-faint">{m.fromName || m.from}</span>
                </span>
                <span className="shrink-0 text-[14px] text-ink-faint">{timeLeft(m.receivedAt, now).text.replace(" late", " ago")}</span>
              </Link>
            ))}
          </section>
        )}

        {/* AURA, at the foot of the day: tell it what happened, or ask. */}
        <div className="mt-10">
          <AuraComposer />
        </div>

        {/* Test tools only (11 Nov): the clocks run by themselves every five
            minutes. Hidden unless OPS_TEST_TOOLS=on, and never on a phone. */}
        {testToolsShown() && (
          <div className="mt-10 hidden justify-center gap-2 md:flex">
            <form action={runClocksNow}>
              <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-sunk">Run the clocks now</button>
            </form>
            <form action={startTestClock}>
              <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-sunk">Start a two-hour test clock</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
