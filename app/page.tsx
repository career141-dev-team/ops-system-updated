import Link from "next/link";
import { redirect } from "next/navigation";

import { approveAllRoutine, approveAndSend, runClocksNow, startTestClock } from "@/app/actions";
import CallPanel from "@/app/(home)/CallPanel";
import CopyButton from "@/app/(home)/CopyButton";
import { AttentionRow, RailCard, Slot, StandsCard, StatStrip, TONE_DOT } from "@/app/(home)/parts";
import { Card, EmptyState, PageTitle } from "@/app/ui/figma";
import { dayItems, desk, runClocks } from "@/data/desk";
import { testToolsShown } from "@/lib/clockPass";
import { draftKind, DRAFT_KINDS } from "@/lib/messages";
import { firstName, greetingFor } from "@/lib/myWork";
import { clockOf, dayBounds, dayShort, draftCounts, draftLine, standsLine, workView } from "@/lib/myWorkView";
import { closeHref, panelHref } from "@/lib/panel";
import { currentMember } from "@/lib/session";

/**
 * My work (v6 frames W1 to W4, 19 Nov): Today, To approve, Calls and Tasks at one address, as `?view=`.
 * The numbers, rows and rails come from `workView` (src/lib/myWorkView.ts), computed from the desk. Panels
 * (`?panel=call-client|write-result&on=<taskId>`) are drawers on this page.
 */
type SP = { msg?: string; view?: string; panel?: string; on?: string; d?: string };

const pill = "rounded-full px-3.5 py-2 text-[12px] font-medium leading-4 ";
const ghost = pill + "border border-rule bg-surface text-ink hover:bg-sunk";
const solid = pill + "bg-ink text-ink-inverse";

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<SP> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const sp = await searchParams;
  if (sp.view === "messages") redirect("/mail");
  const view = sp.view === "approve" || sp.view === "calls" || sp.view === "tasks" ? sp.view : "today";

  // The clocks run on every visit, so a deadline never waits for someone to press something.
  await runClocks();
  const now = Date.now();
  const db = await desk();
  const path = "/";
  const here = view === "today" ? "/" : "/?view=" + view;
  const panel = (name: string, id: string) => panelHref(path, sp as Record<string, string | undefined>, name, id);
  const mail = dayItems(db, member.id, now).find((i) => i.kind === "mail") ?? null;
  const w = workView(db, member.id, now, panel, mail);

  const tabs = [
    { key: "today", label: "Today", href: "/", count: w.counts.today },
    { key: "approve", label: "To approve", href: "/?view=approve", count: w.counts.approve },
    { key: "calls", label: "Calls", href: "/?view=calls", count: w.counts.calls },
    { key: "tasks", label: "Tasks", href: "/?view=tasks", count: w.counts.tasks },
  ];
  const titles = { today: greetingFor(now) + ", " + firstName(member.name), approve: "To approve", calls: "Calls", tasks: "Tasks" };
  const subs = {
    today: `${w.counts.today} ${w.counts.today === 1 ? "thing" : "things"} today · ${w.late} late · ${dayShort(now)}`,
    approve: `${w.counts.approve} ${w.counts.approve === 1 ? "draft waits" : "drafts wait"} for you · ${dayShort(now)}`,
    calls: `${w.counts.calls} to make · ${dayShort(now)}`,
    tasks: `${w.counts.tasks} ${w.counts.tasks === 1 ? "task" : "tasks"} · ${w.late} late · ${dayShort(now)}`,
  };

  const needs = w.doFirst.filter((r) => r.tone !== "danger").length;
  const first = w.doFirst[0];
  const endOfDay = dayBounds(now).end;

  // ── Today ──
  const today = (
    <>
      <StatStrip
        stats={[
          { label: "Late", value: w.late, caption: w.oldestLate ? "oldest " + w.oldestLate : "nothing late", tone: w.late ? "danger" : "ink" },
          { label: "To approve", value: w.counts.approve, caption: "drafts waiting", tone: w.counts.approve ? "warn" : "ink" },
          { label: "Calls", value: w.counts.calls, caption: w.calls[0] ? (w.calls[0].tone === "danger" ? w.calls[0].tag : "next " + w.calls[0].tag) : "none to make" },
          { label: "Meetings today", value: w.meetings.length, caption: w.meetings[0] ? clockOf(w.meetings[0].at) : "none today", tone: w.meetings.length ? "info" : "ink" },
          { label: "Waiting on others", value: w.waitsCount, caption: "not due today" },
        ]}
      />
      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
        <Card title="Do first" sub="Late first, then what needs you today. Each has one button.">
          {w.doFirst.length === 0 ? (
            <EmptyState icon="check" title="Nothing is waiting on you.">
              A new task, a draft or an email will appear here first.
            </EmptyState>
          ) : (
            w.doFirst.map((r) => <AttentionRow key={r.key} row={r} />)
          )}
          {w.waitsCount > 0 && (
            <p className="t-small text-ink-3">
              {w.waitsCount} more {w.waitsCount === 1 ? "thing waits" : "things wait"} on somebody else or {w.waitsCount === 1 ? "is" : "are"} not due today.
            </p>
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <StandsCard
            line={standsLine(w.late, needs)}
            sub={first ? `Clear ${first.title} first: ${first.line}`.slice(0, 160) : "A new task, a draft or an email will appear here."}
            action={first?.button ? { ...first.button, label: "Start with " + (first.title.split(" · ")[0] ?? first.title) } : null}
          />
          <RailCard title="Today by time">
            {w.timeline.length === 0 ? (
              <p className="t-small text-ink-3">No meeting or call is booked for a time today.</p>
            ) : (
              w.timeline.map((s) => <Slot key={s.key} time={clockOf(s.at)} title={s.title} sub={s.sub} />)
            )}
          </RailCard>
          <RailCard title="My clients today">
            {w.clientsToday.length === 0 ? (
              <p className="t-small text-ink-3">Nothing is waiting on a client today.</p>
            ) : (
              w.clientsToday.map((c) => (
                <div key={c.name} className="flex gap-3">
                  <span className="flex pt-1.5">
                    <span aria-hidden="true" className={"size-1.5 rounded-full " + TONE_DOT[c.tone]} />
                  </span>
                  <p className="t-small w-[70px] shrink-0 text-ink-3">{c.name}</p>
                  <p className="t-small min-w-0 flex-1 text-ink">{c.line}</p>
                </div>
              ))
            )}
          </RailCard>
        </div>
      </div>
    </>
  );

  // ── To approve ──
  const picked = w.drafts.find((m) => m.id === sp.d) ?? w.drafts[0];
  const counts = draftCounts(w.drafts);
  const kindWord = (m: (typeof w.drafts)[number]) => DRAFT_KINDS.find((k) => k.key === draftKind(m))?.what ?? "Message";
  const approve = (
    <>
      <StatStrip stats={counts.map((k) => ({ label: k.what, value: k.count, caption: "to approve", tone: k.count ? ("warn" as const) : ("ink" as const) }))} />
      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
        <Card
          title="Waiting for you"
          sub="Check each draft. Each has one button."
          right={
            w.routine.length > 0 ? (
              <form action={approveAllRoutine}>
                <input type="hidden" name="back" value={here} />
                <button title="Sends every draft made from a template somebody approved once. Nothing hand-written." className={solid}>
                  Approve all routine ({w.routine.length})
                </button>
              </form>
            ) : undefined
          }
        >
          {w.drafts.length === 0 ? (
            <EmptyState icon="check" title="Nothing is waiting for your approval.">
              A draft appears here when something needs a person to say yes.
            </EmptyState>
          ) : (
            w.drafts.map((m) => {
              const l = draftLine(m);
              return (
                <div key={m.id} className={"flex items-center gap-[18px] rounded-[18px] px-5 py-4 max-md:flex-wrap " + (m.id === picked?.id ? "bg-info-soft" : "bg-sunk")}>
                  <p className="t-label flex w-[130px] shrink-0 items-center gap-2 text-warn">
                    <span aria-hidden="true" className="size-2 rounded-full bg-warn" />
                    {kindWord(m)}
                  </p>
                  <Link href={"/?view=approve&d=" + m.id} scroll={false} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="t-body-m truncate">{l.title}</span>
                    <span className="t-small truncate text-ink-2">{l.line}</span>
                  </Link>
                  {m.channel === "group_post" ? (
                    <CopyButton text={m.body} label="Copy" className={ghost} />
                  ) : (
                    <form action={approveAndSend}>
                      <input type="hidden" name="messageId" value={m.id} />
                      <input type="hidden" name="back" value={here} />
                      <button className={ghost}>Approve</button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <StandsCard
            line={w.drafts.length ? `${w.drafts.length} ${w.drafts.length === 1 ? "draft" : "drafts"}, ${w.routine.length} routine.` : "Nothing to approve."}
            sub={w.drafts[0] ? `The oldest is ${draftLine(w.drafts[0]).title}.` : "Nothing reaches a client until you say so."}
          />
          {picked && (
            <RailCard title="Draft">
              <h3 className="t-h2">{draftLine(picked).title}</h3>
              <p className="t-small text-ink-3">{draftLine(picked).line}</p>
              <div className="flex flex-col gap-2.5">
                {picked.body
                  .trim()
                  .split(/\n\s*\n/)
                  .map((para, i) => (
                    <p key={i} className="t-small whitespace-pre-wrap text-ink-2">
                      {para}
                    </p>
                  ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {picked.channel === "group_post" ? (
                  <>
                    <CopyButton text={picked.body} label="Copy the message" className={solid} />
                    <p className="t-small basis-full text-ink-3">Nothing can send this: copy it, then post it yourself.</p>
                  </>
                ) : (
                  <form action={approveAndSend}>
                    <input type="hidden" name="messageId" value={picked.id} />
                    <input type="hidden" name="back" value={here} />
                    <button className={solid}>Approve and send</button>
                  </form>
                )}
                <Link href={"/messages/" + picked.id} className={ghost}>
                  Edit
                </Link>
              </div>
            </RailCard>
          )}
        </div>
      </div>
    </>
  );

  // ── Calls ──
  const late = w.calls.filter((r) => r.tone === "danger");
  const dueToday = w.calls.filter((r) => r.tone !== "danger" && r.at < endOfDay);
  const done = w.doneCalls.length;
  const calls = (
    <>
      <StatStrip
        stats={[
          { label: "To call", value: w.calls.length, caption: late.length + " is late", tone: late.length ? "danger" : "ink" },
          { label: "Due today", value: dueToday.length, caption: dueToday.map((r) => r.tag).slice(0, 2).join(" and ") || "none", tone: dueToday.length ? "warn" : "ink" },
          { label: "Done today", value: done, caption: done ? "since " + clockOf(w.doneCalls[0].at) : "none yet", tone: done ? "ok" : "ink" },
        ]}
      />
      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
        <Card title="To call" sub="Late first, then by time. Each has one button.">
          {w.calls.length === 0 ? (
            <EmptyState icon="phone" title="Nobody is waiting on a call.">
              A call task appears here when the desk sets one.
            </EmptyState>
          ) : (
            w.calls.map((r) => (
              <AttentionRow key={r.key} row={r}>
                {r.taskId && (
                  <Link href={panel("write-result", r.taskId)} scroll={false} className="t-small shrink-0 text-ink-3 underline hover:text-ink">
                    Already called?
                  </Link>
                )}
              </AttentionRow>
            ))
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <StandsCard
            line={w.calls.length ? `${w.calls.length} ${w.calls.length === 1 ? "call" : "calls"}${late.length ? `, ${late.length} late.` : "."}` : "No calls to make."}
            sub={w.calls[0] ? `${w.calls[0].title} is the oldest: ${w.calls[0].tag}.` : "Calls stay human: a person rings, then writes it down."}
          />
          <RailCard title="Done today">
            {w.doneCalls.length === 0 ? (
              <p className="t-small text-ink-3">No call written down yet today.</p>
            ) : (
              w.doneCalls.map((c) => (
                <div key={c.key} className="flex gap-3">
                  <span className="flex pt-1.5">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                  </span>
                  <p className="t-small w-[44px] shrink-0 text-ink-3">{clockOf(c.at)}</p>
                  <p className="t-small min-w-0 flex-1 text-ink">
                    {c.who} · {c.line}
                  </p>
                </div>
              ))
            )}
          </RailCard>
        </div>
      </div>
    </>
  );

  // ── Tasks ──
  const cols = [
    { key: "late", label: "Late", dot: "bg-danger" },
    { key: "today", label: "Today", dot: "bg-ink-3" },
    { key: "waits", label: "Waits for", dot: "bg-warn" },
    { key: "later", label: "Later", dot: "bg-ink-3" },
  ] as const;
  const firstTask = w.board.late[0] ?? w.board.today[0];
  const tasks = (
    <>
      <StatStrip
        stats={[
          { label: "Late", value: w.board.late.length, caption: w.oldestLate ? "oldest " + w.oldestLate : "nothing late", tone: w.board.late.length ? "danger" : "ink" },
          { label: "Today", value: w.board.today.length, caption: w.board.today.filter((c) => c.button?.label === "Call").length + " are calls" },
          { label: "Waits for", value: w.board.waits.length, caption: "others have to answer first", tone: w.board.waits.length ? "warn" : "ink" },
          { label: "Later", value: w.board.later.length, caption: w.nextLater ? "next one " + w.nextLater : "nothing later" },
        ]}
      />
      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
        <Card title="Board" sub="Late first. Each card has one button.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cols.map((col) => (
              <div key={col.key} className="flex flex-col gap-3 rounded-[18px] bg-sunk p-3">
                <p className="t-body-m flex items-center gap-2 px-1">
                  <span aria-hidden="true" className={"size-2 rounded-full " + col.dot} />
                  <span className="flex-1">{col.label}</span>
                  <span className="t-small text-ink-3">{w.board[col.key].length}</span>
                </p>
                {w.board[col.key].slice(0, 4).map((t) => (
                  <article key={t.key} className="flex flex-col gap-1 rounded-[14px] bg-surface p-3.5">
                    <p className="t-body-m">{t.title}</p>
                    <p className="t-small text-ink-3">{t.sub}</p>
                    <p className={"t-small " + (col.key === "late" ? "text-danger" : col.key === "waits" ? "text-warn" : "text-ink-3")}>{t.due}</p>
                    <div className="pt-2">
                      {col.key === "waits" ? (
                        <button disabled title="Not connected yet: moving a task to later" className={ghost + " opacity-50"}>
                          Later
                        </button>
                      ) : (
                        // Done opens the task: nothing closes without a line about what happened.
                        <Link href={"/tasks/" + t.key} className={ghost}>
                          Done
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
                {w.board[col.key].length > 4 && <p className="t-small px-1 text-ink-3">{w.board[col.key].length - 4} more</p>}
                {w.board[col.key].length === 0 && <p className="t-small px-1 text-ink-3">Nothing here.</p>}
              </div>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <StandsCard
            line={w.board.late.length || w.board.today.length ? `${w.board.late.length} late, ${w.board.today.length} today.` : "Nothing is due."}
            sub={w.board.waits.length ? `Clear the late tasks first. ${w.board.waits.length} wait for someone else and need nothing from you today.` : "Clear the late tasks first."}
          />
          {firstTask && (
            <RailCard title={firstTask.due.startsWith("Late") ? "Oldest late" : "Next"}>
              <h3 className="t-h2">{firstTask.title}</h3>
              <p className="t-small whitespace-pre-line text-ink-2">{firstTask.line}</p>
            </RailCard>
          )}
        </div>
      </div>
    </>
  );

  // The drawer, only if its task still exists and is open.
  const onTask = db.tasks.find((t) => t.id === sp.on && t.state === "open");
  const open = (sp.panel === "call-client" || sp.panel === "write-result") && onTask ? sp.panel : null;

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle title={titles[view]} sub={subs[view]} tabs={tabs} active={view} />
      {sp.msg && <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{sp.msg}</p>}
      {view === "today" ? today : view === "approve" ? approve : view === "calls" ? calls : tasks}
      {open && onTask && <CallPanel db={db} task={onTask} mode={open} now={now} back={here} close={closeHref(path, sp as Record<string, string | undefined>)} />}
      {testToolsShown() && (
        <div className="hidden justify-center gap-2 md:flex">
          <form action={runClocksNow}>
            <button className={ghost}>Run the clocks now</button>
          </form>
          <form action={startTestClock}>
            <button className={ghost}>Start a two-hour test clock</button>
          </form>
        </div>
      )}
    </div>
  );
}
