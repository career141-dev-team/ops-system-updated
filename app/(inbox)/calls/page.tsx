import Link from "next/link";
import { redirect } from "next/navigation";

import { recordCall } from "@/app/actions";
import Icon from "@/app/Icon";
import InboxHead, { Chip, SideRow, pane, sideCaption } from "@/app/(inbox)/InboxHead";
import { aboutWhom } from "@/app/MessagesView";
import { PageBox, figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import type { OpsCallLog, OpsTask } from "@/data/types";
import { CALL_PURPOSES, purposeInWords, telLink } from "@/lib/calls";
import { LABELS, dayGroup, labelFor, matchesWords, subjectHref } from "@/lib/inboxView";
import { bubbleWhen, initialsOf } from "@/lib/myWork";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const TONES = ["bg-brand-tint text-brand", "bg-warn-soft text-warn", "bg-violet-soft text-violet", "bg-info-soft text-info"];
const FOLDERS = [
  { key: "all", label: "All calls" },
  { key: "tocall", label: "To call" },
  { key: "mine", label: "Mine" },
] as const;

/**
 * Calls (17 Nov, Figma 396:11347): what to filter by down the side, the calls by day in the middle, the one chosen on
 * the right.
 *
 * The owner's decision 7 still stands: calls stay human. Nothing here dials anybody - "Call back" is the phone's own
 * link - and a call is what a person wrote down afterwards: who, why, who answered, what was said. The frame's
 * duration, recording and incoming/missed come from a phone system Ops does not have, so they are not drawn; "To call"
 * is the call tasks the system set, and the next step on a call is the open call task on the same record.
 */
export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; task?: string; f?: string; label?: string; who?: string; q?: string; c?: string; new?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const sp = await searchParams;
  const mayDo = can(member, "task.do");

  const db = await desk();
  const now = Date.now();
  const folder = FOLDERS.some((f) => f.key === sp.f) ? (sp.f as string) : "all";
  const label = LABELS.some((l) => l.key === sp.label) ? (sp.label as string) : null;
  const who = db.members.some((m) => m.id === sp.who) ? (sp.who as string) : null;
  const q = (sp.q ?? "").trim();
  const nameOf = (id: string) => db.members.find((m) => m.id === id)?.name ?? "somebody";
  const recordOf = (type: string | null, id: string | null) => (type && id ? (aboutWhom(db, type, id) ?? null) : null);

  const waiting = db.tasks.filter((t) => t.kind === "call" && t.state === "open").sort((a, b) => a.dueAt - b.dueAt);
  const allCalls = [...db.calls].sort((a, b) => b.at - a.at);
  const fits = (type: string | null, by: string, words: (string | null)[]) =>
    (!label || labelFor(type) === label) && (!who || by === who) && (!q || matchesWords(q, ...words));
  const calls = allCalls.filter(
    (c) => (folder !== "mine" || c.by === member.id) && fits(c.subjectType, c.by, [c.toName, c.spokeTo, c.to, c.outcome, purposeInWords(c.purpose), recordOf(c.subjectType, c.subjectId)]),
  );
  const tasks = waiting.filter((t) => fits(t.subjectType, t.assigneeId, [t.title, t.body, recordOf(t.subjectType, t.subjectId)]));

  const task = waiting.find((t) => t.id === sp.task) ?? null;
  const writing = Boolean(task || sp.new);
  const chosen = writing ? null : (calls.find((c) => c.id === sp.c) ?? (folder === "tocall" ? null : calls[0]) ?? null);

  const view = { f: folder === "all" ? undefined : folder, label: label ?? undefined, who: who ?? undefined, q: q || undefined };
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...view, ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return "/calls" + (s ? "?" + s : "");
  };

  return (
    <PageBox width="full" className="gap-5 md:flex-1">
      <InboxHead
        title="Call"
        on="calls"
        count={allCalls.length + (allCalls.length === 1 ? " call" : " calls")}
        action={
          mayDo ? (
            <Link href={href({ new: "1" })} className={pillPrimary}>
              New call
            </Link>
          ) : undefined
        }
      />

      {sp.msg && <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{sp.msg}</p>}

      <div className="grid min-h-0 grid-cols-1 gap-4 md:flex-1 lg:grid-cols-[220px_minmax(300px,380px)_1fr]">
        {/* What to show. */}
        <aside className={pane + " gap-1 p-3 lg:overflow-y-auto"}>
          <p className={sideCaption + " pb-1 pt-2"}>Calls</p>
          {FOLDERS.map((f) => (
            <SideRow
              key={f.key}
              href={href({ f: f.key === "all" ? undefined : f.key })}
              label={f.label}
              count={f.key === "all" ? allCalls.length : f.key === "tocall" ? waiting.length : allCalls.filter((c) => c.by === member.id).length}
              on={folder === f.key}
            />
          ))}
          <div className="mx-3 my-3 border-t border-rule" />
          <p className={sideCaption + " pb-2"}>Linked records</p>
          <div className="flex flex-wrap gap-2 px-3">
            {LABELS.map((l) => (
              <Chip key={l.key} href={href({ label: label === l.key ? undefined : l.key })} label={l.label} on={label === l.key} />
            ))}
          </div>
          <p className={sideCaption + " pb-2 pt-5"}>Call owner</p>
          <form action="/calls" className="flex flex-col gap-2 px-3">
            {Object.entries(view).map(([k, v]) => (k !== "who" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <select name="who" defaultValue={who ?? ""} aria-label="Call owner" className="rounded-[12px] border border-rule bg-surface px-3 py-2 text-[13px] text-ink">
              <option value="">All team members</option>
              {db.members
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            <button className="self-start text-[12px] font-medium text-brand hover:underline">Show</button>
          </form>
          {waiting.length > 0 && (
            <Link href={href({ f: "tocall" })} className="mt-auto rounded-[16px] bg-brand-tint p-4 hover:bg-brand-soft">
              <p className="text-[13px] font-medium text-brand">Keep the conversation going</p>
              <p className="mt-1.5 text-[12px] leading-[18px] text-ink-soft">
                {waiting.length} {waiting.length === 1 ? "call is" : "calls are"} waiting to be made. Write each one down when it is done.
              </p>
            </Link>
          )}
        </aside>

        {/* The calls, by day; or the calls waiting. */}
        <section className={pane + " p-4 lg:overflow-hidden"}>
          <div className="px-1">
            <h2 className="text-[18px] font-medium leading-[26px] text-ink">{folder === "tocall" ? "To call" : "Call history"}</h2>
            <p className="text-[12px] leading-4 text-ink-faint">
              {folder === "tocall" ? tasks.length + " waiting" : calls.length + (calls.length === 1 ? " call" : " calls")}
            </p>
          </div>
          <form action="/calls" className="mt-3 flex items-center gap-2 rounded-full bg-sunk px-4 py-2.5">
            {Object.entries(view).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <Icon name="search" size={14} className="text-ink-faint" />
            <input name="q" autoComplete="off" defaultValue={q} placeholder="Search calls or contacts" aria-label="Search calls" className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint" />
          </form>
          <nav aria-label="Calls" className="mt-3 flex min-h-0 flex-col lg:overflow-y-auto">
            {folder === "tocall" ? (
              tasks.length === 0 ? (
                <p className="px-3 py-4 text-[14px] text-ink-soft">Nobody is waiting on a call.</p>
              ) : (
                tasks.map((t, i) => <TaskRow key={t.id} t={t} i={i} on={t.id === task?.id} href={href({ task: t.id })} who={nameOf(t.assigneeId)} now={now} />)
              )
            ) : calls.length === 0 ? (
              <p className="px-3 py-4 text-[14px] text-ink-soft">{q || label || who ? "No call matches that." : "No call written down yet."}</p>
            ) : (
              (["Today", "Yesterday", "Earlier"] as const).map((day) => {
                const those = calls.filter((c) => dayGroup(c.at, now) === day);
                if (those.length === 0) return null;
                return (
                  <div key={day} className="flex flex-col">
                    <p className={sideCaption + " pb-1.5 pt-3"}>{day}</p>
                    {those.map((c, i) => (
                      <CallRow key={c.id} c={c} i={i} on={c.id === chosen?.id} href={href({ c: c.id })} record={recordOf(c.subjectType, c.subjectId)} who={nameOf(c.by)} now={now} />
                    ))}
                  </div>
                );
              })
            )}
          </nav>
        </section>

        {/* The one chosen, or writing one down. */}
        <section className={pane + " p-5 lg:overflow-y-auto"}>
          {writing ? (
            mayDo ? (
              <WriteDown task={task} back={href({})} />
            ) : (
              <p className="text-[14px] text-ink-faint">{refusal("task.do")}</p>
            )
          ) : chosen ? (
            <Chosen
              key={chosen.id}
              c={chosen}
              record={recordOf(chosen.subjectType, chosen.subjectId)}
              recordHref={subjectHref(chosen.subjectType, chosen.subjectId)}
              by={nameOf(chosen.by)}
              next={waiting.find((t) => t.subjectType && t.subjectType === chosen.subjectType && t.subjectId === chosen.subjectId) ?? null}
              nextHref={(id: string) => href({ task: id })}
              nameOf={nameOf}
              now={now}
            />
          ) : (
            <p className="m-auto text-center text-[14px] text-ink-soft">
              {folder === "tocall" ? "Choose a call to write down what was said." : "A call opens here once one is written down."}
            </p>
          )}
        </section>
      </div>

      <p className="text-[12px] leading-4 text-ink-faint">Call history, notes and follow-ups stay linked to the right client or opening record.</p>
    </PageBox>
  );
}

function CallRow({ c, i, on, href, record, who, now }: { c: OpsCallLog; i: number; on: boolean; href: string; record: string | null; who: string; now: number }) {
  const name = c.toName || c.spokeTo || c.to;
  return (
    <Link
      href={href}
      scroll={false}
      data-row
      data-open
      aria-current={on ? "page" : undefined}
      className={"flex gap-3 rounded-[16px] p-3 transition-colors " + (on ? "bg-brand-tint" : "border-b border-rule hover:bg-sunk")}
    >
      <span className={"flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium " + TONES[i % TONES.length]}>{initialsOf(name)}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={"truncate text-[14px] font-medium leading-[21px] " + (on ? "text-brand" : "text-ink")}>{name}</span>
        <span className="truncate text-[12px] leading-4 text-ink-faint">{[record, purposeInWords(c.purpose)].filter(Boolean).join(" · ")}</span>
        <span className="truncate text-[12px] leading-4 text-ink-soft">Spoke to {c.spokeTo || "nobody"} · {who}</span>
      </span>
      <span className="shrink-0 text-[11px] leading-4 text-ink-faint">{new Date(c.at + 5.5 * 3_600_000).toISOString().slice(11, 16)}{dayGroup(c.at, now) === "Earlier" ? " · " + bubbleWhen(c.at, now).split(" ")[0] : ""}</span>
    </Link>
  );
}

function TaskRow({ t, i, on, href, who, now }: { t: OpsTask; i: number; on: boolean; href: string; who: string; now: number }) {
  const late = t.dueAt < now;
  return (
    <Link href={href} scroll={false} aria-current={on ? "page" : undefined} className={"flex gap-3 rounded-[16px] p-3 transition-colors " + (on ? "bg-brand-tint" : "border-b border-rule hover:bg-sunk")}>
      <span className={"flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium " + TONES[i % TONES.length]}>
        <Icon name="flag" size={14} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={"truncate text-[14px] font-medium leading-[21px] " + (on ? "text-brand" : "text-ink")}>{t.title}</span>
        <span className="truncate text-[12px] leading-4 text-ink-faint">{who}</span>
        <span className={"truncate text-[12px] leading-4 " + (late ? "text-danger" : "text-ink-soft")}>{late ? "Late · follow-up needed" : "Due " + bubbleWhen(t.dueAt, now)}</span>
      </span>
    </Link>
  );
}

function Chosen({
  c,
  record,
  recordHref,
  by,
  next,
  nextHref,
  nameOf,
  now,
}: {
  c: OpsCallLog;
  record: string | null;
  recordHref: string | null;
  by: string;
  next: OpsTask | null;
  nextHref: (id: string) => string;
  nameOf: (id: string) => string;
  now: number;
}) {
  const name = c.toName || c.spokeTo || c.to;
  const dial = telLink(c.to);
  const tile = (k: string, v: string) => (
    <div className="flex flex-col gap-1 rounded-[14px] bg-sunk px-4 py-3">
      <span className="text-[11px] leading-4 text-ink-faint">{k}</span>
      <span className="truncate text-[14px] font-medium leading-[21px] text-ink">{v}</span>
    </div>
  );
  return (
    <div className="rise flex flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3 border-b border-rule pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-medium text-brand">{initialsOf(name)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div>
            <p className="truncate text-[16px] font-medium leading-[26px] text-ink">{name}</p>
            {record && <p className="truncate text-[12px] leading-4 text-ink-faint">{record}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] bg-brand-tint px-3 py-1 text-[12px] font-medium text-brand">Written down</span>
            <span className="text-[12px] text-ink-soft">{c.to}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recordHref && (
            <Link href={recordHref} className="rounded-[12px] border border-rule px-4 py-2 text-[14px] text-ink hover:bg-sunk">
              Open record
            </Link>
          )}
          {dial && (
            <a href={dial} className="rounded-[12px] bg-brand px-4 py-2 text-[14px] font-medium text-ink-inverse">
              Call back
            </a>
          )}
        </div>
      </header>

      <div>
        <h2 className="text-[22px] leading-[30px] text-ink">{purposeInWords(c.purpose)}</h2>
        <p className="text-[12px] leading-4 text-ink-faint">
          {bubbleWhen(c.at, now)} · Logged by {by}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tile("Spoke to", c.spokeTo || "Nobody answered")}
        {tile("Number", c.to)}
        {tile("Linked to", record ?? "Nothing")}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[16px] font-medium leading-[26px] text-ink">What was said</h3>
        <p className="whitespace-pre-wrap rounded-[14px] border border-rule px-4 py-3 text-[14px] leading-[22px] text-ink">{c.outcome}</p>
      </div>

      {next ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-brand-tint px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-brand">Next step</p>
            <p className="text-[14px] font-medium leading-[21px] text-ink">{next.title}</p>
            <p className="text-[12px] leading-4 text-ink-soft">
              Due {bubbleWhen(next.dueAt, now)} · Assigned to {nameOf(next.assigneeId)}
            </p>
          </div>
          <Link href={nextHref(next.id)} className="rounded-[12px] bg-brand px-4 py-2 text-[14px] font-medium text-ink-inverse">
            Write it down
          </Link>
        </div>
      ) : (
        <p className="text-[13px] text-ink-faint">No call is waiting on this record.</p>
      )}
    </div>
  );
}

/** Writing a call down: the same form as before, in the right-hand pane. Saving a task's call finishes the task. */
function WriteDown({ task, back }: { task: OpsTask | null; back: string }) {
  return (
    <form action={recordCall} className="rise flex flex-col gap-3.5">
      {task && <input type="hidden" name="taskId" value={task.id} />}
      {task?.subjectType && <input type="hidden" name="subjectType" value={task.subjectType} />}
      {task?.subjectId && <input type="hidden" name="subjectId" value={task.subjectId} />}
      <div>
        <h2 className="text-[22px] leading-[30px] text-ink">{task ? "What happened on this call" : "Write down a call"}</h2>
        <p className="text-[13px] text-ink-soft">{task ? task.title : "A person rings; the system remembers who, why and what was said. Nothing here dials anybody."}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={figmaLabel}>
          Number
          <input name="to" placeholder="077 123 4567" required className={figmaField} />
        </label>
        <label className={figmaLabel}>
          Whose number
          <input name="toName" placeholder="the client, the candidate" className={figmaField} />
        </label>
      </div>
      <label className={figmaLabel}>
        Why
        <select name="purpose" className={figmaField} defaultValue={task ? "feedback.chase" : "other"}>
          {Object.entries(CALL_PURPOSES).map(([key, words]) => (
            <option key={key} value={key}>
              {words}
            </option>
          ))}
        </select>
      </label>
      <label className={figmaLabel}>
        Who you spoke to
        <input name="spokeTo" placeholder="a name, or that nobody answered" required className={figmaField} />
      </label>
      <label className={figmaLabel}>
        What was said
        <textarea name="outcome" rows={4} required className={figmaField} />
      </label>
      <div className="flex items-center gap-3">
        <button className={pillPrimary}>{task ? "Save and finish the task" : "Save"}</button>
        <Link href={back} className="px-3 text-[14px] font-medium text-ink-soft hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
