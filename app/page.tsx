import Link from "next/link";
import { redirect } from "next/navigation";

import AuraComposer from "@/app/AuraComposer";
import AuraMark from "@/app/AuraMark";
import MessagesView, { aboutWhom } from "@/app/MessagesView";
import Icon from "@/app/Icon";
import { DRAFT_KINDS, draftKind, isRoutine, messageInWords, messageTitle } from "@/lib/messages";
import { IMPROVE_WORDS } from "@/lib/aiTasks";
import { approveAllRoutine, approveAndSend, improveDraft } from "@/app/actions";
import { aiSwitches, dayItems, desk, draftsWaiting, fileIn, liveTimersFor, runClocks, templateFor, whyFirstKept } from "@/data/desk";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { testToolsShown } from "@/lib/clockPass";
import { firstBecause, orderTheDay, whatFirstKey, type DayItem } from "@/lib/whatFirst";
import { colomboDate } from "@/lib/calendar";
import { previewable } from "@/lib/files";
import { clockInWords, timeLeft } from "@/lib/timers";
import { currentMember } from "@/lib/session";
import { seesWholeDesk } from "@/lib/roles";
import {
  dayInWords,
  doneToday,
  firstName,
  foldDrafts,
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

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; view?: string; later?: string; all?: string; kind?: string; n?: string; t?: string; file?: string }>;
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
  // The counts above use every item; the list under Then folds the drafts into one row.
  const [first, ...others] = foldDrafts(items);
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

  // The three views: one row of pills with counts, never a second menu (Figma "View pill").
  const viewNav = (align: string) => (
    <nav aria-label="Views" className={"flex flex-wrap items-center gap-0.5 " + align}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={href(tab.key)}
          aria-current={view === tab.key ? "page" : undefined}
          className={
            "flex items-center gap-2 rounded-full px-4 py-[9px] text-[14px] leading-[21px] transition-colors duration-200 " +
            (view === tab.key ? "bg-sunk text-ink" : "text-ink-soft hover:text-ink")
          }
        >
          {tab.what}
          <span className="text-ink-faint">{tab.count}</span>
        </Link>
      ))}
    </nav>
  );

  // Messages is two panes edge to edge (Figma "MW · Messages"), so it has a frame of its own.
  if (view === "messages") {
    return (
      <MessagesView
        db={db}
        member={member}
        wholeDesk={wholeDesk}
        now={now}
        nav={viewNav("justify-start")}
        selected={params.t}
        msg={params.msg}
        aiOn={aiOn}
        aiOff={aiOffReason(anyKeySet(), aiSwitches(db).on)}
      />
    );
  }

  return (
    // A column on a desktop, so on Today the greeting, Up next and AURA stay put and only the list scrolls (14 Nov).
    <div className={"relative rounded-sheet bg-surface px-4 pb-10 pt-8 shadow-card max-md:overflow-hidden md:flex md:flex-col md:px-10 " + (view === "approve" ? "md:pt-[60px]" : "")}>
      {/* The aurora: the glow behind the greeting, drawn in CSS, not an image. Today only. The Figma frame (249:8477) draws
          one ellipse, violet to blue to teal to green, blurred 70px at 22%; the owner asked for the same colours with more
          glow (17 Nov), so it is the same ellipse and the same blur at about twice the strength. */}
      {view === "today" && <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[60px] h-[420px] w-[900px] max-w-full -translate-x-1/2 rounded-full opacity-[0.5] blur-[70px] dark:opacity-[0.3]"
        style={{ background: "linear-gradient(90deg, #8b5cff 0%, #3d6bff 45%, #21d4c4 75%, #8cf559 100%)" }}
      />}

      <div className={"relative mx-auto flex w-full flex-col md:min-h-0 md:flex-1 " + (view === "approve" ? "max-w-[920px]" : "max-w-[820px]")}>
        {viewNav(view === "approve" ? "justify-start" : "justify-center")}

        {view !== "approve" && (
        <header className="rise mt-1 flex flex-col items-center gap-1 text-center">
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
        )}

        {params.msg && (
          <p className="mt-6 rounded-panel border border-rule bg-surface px-4 py-2.5 text-[14px]">{params.msg}</p>
        )}

        {view === "today" && (
          <div className="rise flex flex-col md:min-h-0 md:flex-1">
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
              // The one part of Today that scrolls, and only when the rows outgrow the space left.
              // It takes the space left between Up next and AURA; AURA stays at the foot of the box.
              <section className="mt-6 flex flex-col gap-1 md:min-h-0 md:overflow-y-auto">
                <div className="sticky top-0 z-[1] flex items-center bg-surface px-2 py-1">
                  <p className={caption + " flex-1"}>{params.all ? "Everything today" : "Then"}</p>
                  {params.all ? (
                    <Link href={href("today")} className={caption + " hover:text-ink"}>Show fewer</Link>
                  ) : (
                    others.length > 0 && <Link href={href("today", { all: "1" })} className={caption + " hover:text-ink"}>See all {items.length}</Link>
                  )}
                </div>
                {(params.all ? others : others.slice(0, 4)).map(dayRow)}
              </section>
            )}

            {/* Every clock running for you, beyond today too: the old day page's list. */}
            {params.all && clocks.length > 0 && (
              <section className="mt-6 flex flex-col gap-1 md:min-h-0 md:overflow-y-auto">
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
          </div>
        )}

        {view === "approve" && (() => {
          // One draft at a time (13 Nov, the Figma "MW · Approvals"): the pills filter, the arrows and Skip walk, A / E / S are the keys.
          const kinds = DRAFT_KINDS.map((k) => ({ ...k, count: drafts.filter((m) => draftKind(m) === k.key).length }));
          const kind = kinds.find((k) => k.key === params.kind)?.key;
          const list = kind ? drafts.filter((m) => draftKind(m) === kind) : drafts;
          const at = Math.min(Math.max((Number(params.n) || 1) - 1, 0), Math.max(list.length - 1, 0));
          const draft = list[at];
          const go = (n: number, k = kind) =>
            "/?" + new URLSearchParams({ view: "approve", ...(k ? { kind: k } : {}), ...(n > 1 ? { n: String(n) } : {}) }).toString();
          const here = go(at + 1);
          const next = go(at + 2 > list.length ? 1 : at + 2);
          const carries = draft ? (draft.attachmentFileIds ?? []).map((id) => fileIn(db, id)).filter((f) => f !== null) : [];
          // Only a file this draft carries, and only one a browser can show, ever opens over the page.
          const shown = carries.find((f) => f.id === params.file && previewable(f.mime));
          const whoFor = draft ? aboutWhom(db, draft.subjectType, draft.subjectId) : null;
          const chip = draft ? (draft.templateKey ? templateFor(db, draft.templateKey)?.name : null) ?? DRAFT_KINDS.find((k) => k.key === draftKind(draft))?.what : null;
          const pill = "flex items-center gap-2 rounded-full px-4 py-[9px] text-[14px] leading-[21px] transition-colors ";
          const ghost = "rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink hover:bg-sunk";
          const round = "flex size-10 items-center justify-center rounded-full border border-rule-strong text-ink hover:bg-sunk";
          const small = "rounded-full bg-sunk px-3.5 py-[7px] text-[14px] font-medium leading-[21px] text-ink hover:bg-shell disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-sunk";
          return (
            <section className="rise mt-[18px] flex flex-col">
              <div className="flex items-center gap-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <h2 className="text-[40px] font-light leading-[50px] text-ink">To approve</h2>
                  <p className="text-[14px] leading-[21px] text-ink-faint">Nothing reaches a client until you say so.</p>
                </div>
                {list.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Link href={go(at === 0 ? list.length : at)} aria-label="Previous draft" className={round}>
                      <Icon name="chevron-left" size={18} />
                    </Link>
                    <span className="text-[14px] font-medium leading-[21px] text-ink">{at + 1} of {list.length}</span>
                    <Link href={next} aria-label="Next draft" className={round}>
                      <Icon name="chevron-right" size={18} />
                    </Link>
                  </div>
                )}
              </div>

              <nav aria-label="Kinds of draft" className="mt-[18px] flex flex-wrap items-center gap-0.5">
                <Link href={go(1, undefined)} aria-current={!kind ? "page" : undefined} className={pill + (!kind ? "bg-sunk text-ink" : "text-ink-soft hover:text-ink")}>
                  All <span className="text-ink-faint">{drafts.length}</span>
                </Link>
                {kinds.map((k) => (
                  <Link key={k.key} href={go(1, k.key)} aria-current={kind === k.key ? "page" : undefined} className={pill + (kind === k.key ? "bg-sunk text-ink" : "text-ink-soft hover:text-ink")}>
                    {k.what} <span className="text-ink-faint">{k.count}</span>
                  </Link>
                ))}
              </nav>

              {!draft ? (
                <p className="mt-8 text-center text-[16px] leading-[26px] text-ink-soft">Nothing is waiting for your approval.</p>
              ) : (
                // data-solo holds the card and its buttons, so A / E / S find Approve, Edit and Skip.
                <div data-row data-solo>
                  {/* The drafts behind this one, as the Figma stack. */}
                  <div className="relative mt-[22px] pb-4">
                    {list.length > 2 && <div aria-hidden="true" className="rise absolute inset-x-11 bottom-0 top-[26px] rounded-[28px] bg-surface opacity-55 shadow-card" />}
                    {list.length > 1 && <div aria-hidden="true" className="rise absolute inset-x-[22px] bottom-0 top-[13px] rounded-[28px] bg-surface opacity-80 shadow-card" />}
                    <article key={draft.id} className="lift relative flex flex-col gap-3 rounded-[28px] bg-surface px-[34px] pb-[26px] pt-7 shadow-float">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1.5 rounded-full bg-bg-brand px-2.5 py-1 text-[14px] font-medium leading-[21px] text-brand">
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                          {chip}
                        </span>
                        {whoFor && <span className="text-[14px] leading-[21px] text-ink-faint">{whoFor}</span>}
                      </div>
                      <h3 className="text-[26px] leading-[34px] text-ink">{messageTitle(draft)}</h3>
                      <p className="text-[14px] leading-[21px] text-ink-faint">{messageInWords(draft)}</p>
                      <div className="flex max-h-[260px] flex-col gap-2.5 overflow-y-auto pb-1 pt-2 text-[16px] leading-[26px] text-ink-soft">
                        {draft.body.trim().split(/\n\s*\n/).map((para, i) => (
                          <p key={i} className="whitespace-pre-wrap">{para}</p>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        {carries.map((file) => (
                          // A PDF or picture opens over this page (16 Nov, owner's Figma); anything else downloads.
                          <Link key={file.id} href={previewable(file.mime) ? here + "&file=" + file.id : "/api/files/" + file.id} className="flex items-center gap-2 rounded-full bg-sunk px-3.5 py-2 text-[14px] leading-[21px] text-ink-soft hover:text-ink">
                            <Icon name="file" size={16} />
                            {file.name}
                          </Link>
                        ))}
                        <span className="flex-1" />
                        <AuraMark size={32} />
                        {/* AURA rewrites; the new words are shown at the draft's own page and nothing is saved until a person presses use it. */}
                        {(["shorter", "warmer", "sinhala"] as const).map((how) => (
                          <form key={how} action={improveDraft}>
                            <input type="hidden" name="messageId" value={draft.id} />
                            <input type="hidden" name="how" value={how} />
                            <button disabled={!aiOn} title={aiOn ? undefined : (aiOffReason(anyKeySet(), aiSwitches(db).on) ?? "")} className={small}>
                              {IMPROVE_WORDS[how]}
                            </button>
                          </form>
                        ))}
                      </div>
                      {draft.channel === "group_post" && (
                        <p className="text-[13px] text-ink-faint">Nothing can send this: approve it, then post it yourself.</p>
                      )}
                    </article>
                  </div>

                  <div className="mt-[26px] flex items-center justify-center gap-3">
                    <Link href={next} data-skip className="rounded-full px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink-soft hover:text-ink">
                      Skip
                    </Link>
                    <Link href={"/messages/" + draft.id} data-edit data-open className={ghost}>
                      Edit
                    </Link>
                    <form action={approveAndSend}>
                      <input type="hidden" name="messageId" value={draft.id} />
                      <input type="hidden" name="back" value={here} />
                      <button data-approve className="rounded-full bg-ink px-5 py-[11px] text-[16px] font-medium leading-[26px] text-ink-inverse active:scale-[0.98]">
                        {draft.channel === "group_post" ? "Approve" : "Approve and send"}
                      </button>
                    </form>
                  </div>
                  <p className="mt-3 text-center text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">A approve  ·  E edit  ·  S skip</p>
                </div>
              )}

              {/* The file over the page: the one overlay the owner allowed on To approve, closed by its X, the page behind it or Esc. */}
              {shown && (
                <div className="fixed inset-0 z-50">
                  <Link href={here} aria-label="Close the file" tabIndex={-1} className="absolute inset-0 bg-veil backdrop-blur-[4px]" />
                  <div className="absolute inset-x-4 bottom-0 top-[88px] mx-auto max-w-[1100px] overflow-hidden rounded-t-[48px] bg-black/90 px-5 pt-5 md:px-10 md:pt-10">
                    <iframe src={"/api/files/" + shown.id + "?inline=1"} title={shown.name} className="size-full rounded-t-[36px] bg-white" />
                  </div>
                  <Link href={here} data-close aria-label="Close the file" className="absolute right-4 top-4 flex size-12 items-center justify-center rounded-full bg-surface text-ink shadow-float md:right-[5%] md:top-[88px] md:size-[75px]">
                    <Icon name="x" size={30} />
                  </Link>
                </div>
              )}

              {/* Every routine notice at once (7 Nov, UX order 2): only drafts from a template a person approved once. */}
              {routine.length > 0 && (
                <form action={approveAllRoutine} className="mx-auto mt-8 flex items-center gap-3 rounded-full bg-sunk py-2 pl-[18px] pr-2">
                  <input type="hidden" name="back" value={here} />
                  <span className="text-[14px] leading-[21px] text-ink-soft">
                    {routine.length} routine {routine.length === 1 ? "notice" : "notices"} from approved templates
                  </span>
                  <button title="Sends every draft made from a template somebody approved once. Nothing hand-written." className="rounded-full bg-ink px-3.5 py-[7px] text-[14px] font-medium leading-[21px] text-ink-inverse active:scale-[0.98]">
                    Approve all {routine.length}
                  </button>
                </form>
              )}
            </section>
          );
        })()}

        {/* AURA, at the foot of the day: tell it what happened, or ask. */}
        {view === "today" && (
          <div className="mt-6 shrink-0">
            <AuraComposer />
          </div>
        )}

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
