import Link from "next/link";
import type { ReactNode } from "react";

import AuraMark from "@/app/AuraMark";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { finishTask, readInbound, replyInThread } from "@/app/actions";
import type { OpsDatabase, OpsMember } from "@/data/types";
import { buildThreads, replySubject, replyTo, type Thread } from "@/lib/mailbox";
import { bubbleWhen, firstName, initialsOf, shortWhen } from "@/lib/myWork";
import { can } from "@/lib/roles";

/** Who a task, draft or conversation is about, by name: the client line. */
export function aboutWhom(db: OpsDatabase, type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  if (type === "lead") return db.leads.find((l) => l.id === id)?.company ?? null;
  if (type === "client") return db.clients.find((c) => c.id === id)?.name ?? null;
  if (type === "clientSet") return db.clientSets.find((s) => s.id === id)?.name.split(">")[0]?.trim() || null;
  return null;
}

/** What a conversation is filed to, in words and where it opens. */
export function filedTo(db: OpsDatabase, about: { type: string; id: string }): { said: string; href: string } {
  const { type, id } = about;
  const named = (word: string, name: string | null | undefined) => (name ? word + " · " + name : word);
  if (type === "clientSet") return { said: named("CV set", db.clientSets.find((s) => s.id === id)?.name), href: "/sets/" + id };
  if (type === "client") return { said: named("Client", aboutWhom(db, type, id)), href: "/clients/" + id };
  if (type === "lead") return { said: named("Lead", aboutWhom(db, type, id)), href: "/leads/" + id };
  if (type === "invoice") return { said: named("Invoice", db.invoices.find((i) => i.id === id)?.number), href: "/invoices/" + id };
  if (type === "esa") return { said: "the agreement", href: "/mail" };
  return { said: "the " + type, href: "/" + type + "s/" + id };
}

// The avatar tones, in the design's order (Figma "Avatar · AURA tones").
const TONES = ["bg-bg-brand text-brand", "bg-warn-soft text-warn", "bg-violet-soft text-violet", "bg-info-soft text-info"];

/**
 * My Work's Messages (14 Nov, the approved Figma "MW · Messages —
 * conversations filed to their records").
 *
 * The conversations on the left, the one chosen on the right, both
 * directions, with what AURA read in the last one and the reply box under
 * it. Everything here is a link or a form: choosing a conversation is a URL
 * (`?view=messages&t=`), a reply is a draft through `replyInThread`, and it
 * waits in To approve like every other message. Nothing opens over the page.
 */
export default function MessagesView({
  db,
  member,
  wholeDesk,
  now,
  nav,
  selected,
  msg,
  aiOn,
  aiOff,
}: {
  db: OpsDatabase;
  member: OpsMember;
  wholeDesk: boolean;
  now: number;
  nav: ReactNode;
  selected?: string;
  msg?: string;
  aiOn: boolean;
  aiOff: string | null;
}) {
  // The person's own box, or the whole desk for the ops lead and the Director (9 Nov).
  const inbound = db.inbound.filter((i) => wholeDesk || i.mailbox.toLowerCase() === member.email.toLowerCase());
  const unreadIds = new Set(inbound.filter((i) => i.readState === "new").map((i) => i.id));
  // A conversation is one where somebody wrote to us: our own sends alone are the outbox, not this.
  const threads = buildThreads(inbound, db.messages)
    .filter((t) => t.items.some((i) => i.direction === "in"))
    .slice(0, 40);
  const thread = threads.find((t) => t.key === selected) ?? threads[0];
  const hrefOf = (t: Thread) => "/?" + new URLSearchParams({ view: "messages", t: t.key }).toString();

  const companyOf = (t: Thread) =>
    (t.clientId ? db.clients.find((c) => c.id === t.clientId)?.name : null) ??
    (t.about ? aboutWhom(db, t.about.type, t.about.id) : null);
  const unread = (t: Thread) => t.items.some((i) => i.direction === "in" && unreadIds.has(i.id));

  // The layout's page box gives it its height; each pane scrolls on its own, only when it has more than fits.
  return (
    <div className="relative flex flex-col rounded-sheet bg-surface shadow-card max-md:overflow-hidden md:flex-row md:!overflow-hidden">
      {/* The conversations. */}
      <aside className="flex w-full shrink-0 flex-col gap-2.5 border-rule px-4 pb-6 pt-9 md:w-[520px] md:pt-[84px] md:overflow-y-auto md:border-r md:pl-8 md:pr-6">
        {/* Back to Today, and the three views, on one ruled row (Figma 391:7384); the tab above says "Messages". */}
        <div className="flex items-center justify-between gap-3 border-b border-rule pb-5">
          <Link href="/" aria-label="Back to Today" title="Back to Today" className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-brand text-brand transition-colors hover:bg-brand-tint">
            <Icon name="chevron-left" size={18} />
          </Link>
          {nav}
        </div>
        <Link href="/interviews" className="flex items-center gap-1.5 self-start px-2 py-1 text-[14px] leading-[21px] text-ink-soft hover:text-ink">
          <Icon name="calendar" size={15} />
          Calendar
        </Link>

        {threads.length === 0 && (
          <p className="rise px-3 py-2 text-[16px] leading-[26px] text-ink-soft">Nobody has written to us yet.</p>
        )}
        <nav aria-label="Conversations" className="flex flex-col gap-0.5">
          {threads.map((t, i) => {
            const last = t.items[t.items.length - 1];
            const isNew = unread(t);
            const company = companyOf(t);
            return (
              <Link
                key={t.key}
                href={hrefOf(t)}
                scroll={false}
                data-row
                data-open
                aria-current={t.key === thread?.key ? "page" : undefined}
                className={
                  "slide-in flex items-center gap-3 rounded-panel p-3 outline-none transition-colors focus-visible:bg-sunk " +
                  (t.key === thread?.key ? "bg-sunk" : "hover:bg-sunk/60")
                }
                style={{ animationDelay: Math.min(i, 10) * 30 + "ms" }}
              >
                <span className={"flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium leading-[21px] " + TONES[i % TONES.length]}>
                  {initialsOf(t.withName)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[16px] font-medium leading-[26px] text-ink">
                    {firstName(t.withName.replace(/@.*/, ""))}
                    {company ? " · " + company : ""}
                  </span>
                  <span className={"truncate text-[14px] leading-[21px] " + (isNew ? "text-ink-soft" : "text-ink-faint")}>
                    {(last?.body ?? "").split("\n").find((line) => line.trim())?.trim() || last?.subject}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">{shortWhen(t.lastAt, now)}</span>
                  {isNew && <span aria-label="Not read" className="size-2 rounded-full bg-brand" />}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* The one chosen, both directions. Its key on the wrapper replays the arrival when another is chosen. */}
      {thread ? (
        <ThreadPane key={thread.key} db={db} member={member} thread={thread} company={companyOf(thread)} now={now} msg={msg} aiOn={aiOn} aiOff={aiOff} here={hrefOf(thread)} />
      ) : (
        <section className="flex flex-1 items-center justify-center p-12 text-[16px] text-ink-soft">
          A conversation opens here when somebody writes to us.
        </section>
      )}
    </div>
  );
}

function ThreadPane({
  db,
  member,
  thread,
  company,
  now,
  msg,
  aiOn,
  aiOff,
  here,
}: {
  db: OpsDatabase;
  member: OpsMember;
  thread: Thread;
  company: string | null;
  now: number;
  msg?: string;
  aiOn: boolean;
  aiOff: string | null;
  here: string;
}) {
  const who = thread.withName.replace(/@.*/, "") || thread.with[0] || "them";
  const filed = thread.about ? filedTo(db, thread.about) : null;
  const lastIn = [...thread.items].reverse().find((i) => i.direction === "in");
  const lastInMail = lastIn ? db.inbound.find((m) => m.id === lastIn.id) : undefined;

  // What AURA read in their last message: the open task `readInbound` left for it, if there is one.
  const reading = lastInMail
    ? db.tasks.find(
        (t) =>
          t.state === "open" &&
          t.title.startsWith("Confirm what the client said") &&
          ((t.subjectType === "inbound" && t.subjectId === lastInMail.id) ||
            (!!lastInMail.subjectType && t.subjectType === lastInMail.subjectType && t.subjectId === lastInMail.subjectId)),
      )
    : undefined;
  const readAs = reading?.body.split("\n")[0]?.trim();
  const shown = thread.items.slice(-30);

  return (
    <section className="rise flex min-h-[560px] min-w-0 flex-1 flex-col gap-4 px-4 pb-7 pt-8 md:px-12 md:pt-[84px]">
      <header className="flex flex-wrap items-center gap-3 border-b border-rule pb-5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-[26px] leading-[34px] text-ink">{who}</h2>
          <p className="truncate text-[14px] leading-[21px] text-ink-faint">
            {[company, thread.with[0] !== who ? thread.with[0] : null, "Email"].filter(Boolean).join(" · ")}
          </p>
        </div>
        {filed ? (
          <Link href={filed.href} className="flex items-center gap-1.5 rounded-full bg-brand-tint px-3.5 py-2 text-[14px] leading-[21px] text-brand hover:underline">
            <Icon name="link" size={14} />
            Filed to {filed.said}
          </Link>
        ) : (
          <Link href={"/mail/" + encodeURIComponent(thread.key)} className="flex items-center gap-1.5 rounded-full bg-warn-soft px-3.5 py-2 text-[14px] leading-[21px] text-warn hover:underline">
            <Icon name="link" size={14} />
            Not filed yet · file it
          </Link>
        )}
      </header>

      {msg && <p className="rise rounded-panel border border-rule bg-surface px-4 py-2.5 text-[14px]">{msg}</p>}

      {/* Newest at the bottom, and the scroll starts there: column-reverse keeps it pinned without a script. */}
      <div className="flex min-h-[200px] flex-1 flex-col-reverse overflow-y-auto">
        <div className="flex flex-col gap-3">
          {shown.map((item, i) => {
            const out = item.direction === "out";
            const sent = out ? db.messages.find((m) => m.id === item.id) : undefined;
            const approver = sent?.approvedBy ? db.members.find((m) => m.id === sent.approvedBy)?.name : null;
            const meta = out
              ? item.state === "sent"
                ? bubbleWhen(item.at, now) + (approver ? " · approved by " + firstName(approver) : "")
                : item.state === "draft"
                  ? "Draft · waiting for you to approve it"
                  : bubbleWhen(item.at, now) + " · " + item.state
              : bubbleWhen(item.at, now);
            const bubble = (
              <div
                className={
                  "rise flex max-w-[520px] flex-col gap-1 rounded-[20px] px-4 py-3 " +
                  (out ? "bg-brand-tint" : "bg-sunk") +
                  (out && item.state === "draft" ? " border border-dashed border-brand/40" : "")
                }
                style={{ animationDelay: Math.max(0, i - (shown.length - 6)) * 60 + "ms" }}
              >
                <p className="whitespace-pre-wrap break-words text-[16px] leading-[26px] text-ink">{item.body.trim()}</p>
                <p className={"text-[12px] font-medium leading-4 tracking-[0.4px] " + (out && item.state !== "sent" && item.state !== "draft" ? "text-danger" : "text-ink-faint")}>
                  {meta}
                  {item.attachments > 0 ? " · " + item.attachments + (item.attachments === 1 ? " file" : " files") : ""}
                </p>
              </div>
            );
            return (
              <div key={item.direction + item.id} className={"flex " + (out ? "justify-end" : "justify-start")}>
                {out && item.state !== "sent" ? (
                  <Link href={"/messages/" + item.id} className="contents">
                    {bubble}
                  </Link>
                ) : (
                  bubble
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AURA, on the last thing they said: it proposes, a person records. */}
      {lastInMail && (
        <div className="rise flex flex-wrap items-center gap-3 rounded-[24px] bg-surface px-4 py-3.5 shadow-float" style={{ animationDelay: "120ms" }}>
          <AuraMark size={40} />
          {readAs ? (
            <>
              <p className="min-w-0 flex-1 text-[14px] leading-[21px] text-ink">AURA read this as: {readAs}</p>
              <Link href={reading?.link ?? "/tasks/" + reading?.id} className="rounded-full bg-ink px-3.5 py-[7px] text-[14px] font-medium leading-[21px] text-ink-inverse active:scale-[0.98]">
                Record it
              </Link>
              <form action={finishTask}>
                <input type="hidden" name="taskId" value={reading?.id} />
                <input type="hidden" name="outcome" value="AURA read it wrong; read by a person instead." />
                <input type="hidden" name="back" value={here} />
                <button className="rounded-full px-3.5 py-[7px] text-[14px] font-medium leading-[21px] text-ink-soft hover:text-ink">Not quite</button>
              </form>
            </>
          ) : aiOn ? (
            <>
              <p className="min-w-0 flex-1 text-[14px] leading-[21px] text-ink">
                AURA can read what {firstName(who)} said and propose what to record. Nothing is recorded until you say so.
              </p>
              <form action={readInbound}>
                <input type="hidden" name="inboundId" value={lastInMail.id} />
                <input type="hidden" name="back" value={here} />
                <button className="rounded-full bg-ink px-3.5 py-[7px] text-[14px] font-medium leading-[21px] text-ink-inverse active:scale-[0.98]">Read it</button>
              </form>
            </>
          ) : (
            <p className="min-w-0 flex-1 text-[14px] leading-[21px] text-ink-faint">AURA cannot read this: {aiOff ?? "it is switched off."}</p>
          )}
        </div>
      )}

      {/* The reply: a draft like every other message, so it waits in To approve. */}
      {can(member, "message.approve") && (
        <form action={replyInThread} className="flex items-center gap-3.5 rounded-[34px] bg-surface p-2.5 shadow-float">
          <input type="hidden" name="threadKey" value={thread.key} />
          <input type="hidden" name="to" value={replyTo(thread).join(", ")} />
          <input type="hidden" name="subject" value={replySubject(thread.subject)} />
          <input type="hidden" name="back" value={here} />
          <Link
            href={"/mail/" + encodeURIComponent(thread.key)}
            title="Open the whole conversation, its files and filing"
            aria-label="Open the whole conversation"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft hover:text-ink"
          >
            <Icon name="plus" size={18} />
          </Link>
          <input
            id="reply-text"
            name="body"
            required
            autoComplete="off"
            placeholder={"Reply to " + firstName(who) + " — it sends after you approve"}
            aria-label={"Reply to " + who}
            className="min-w-0 flex-1 bg-transparent text-[16px] leading-[26px] text-ink outline-none placeholder:text-ink-faint"
          />
          <Dictate into="reply-text" label="Speak the reply" round />
          <button
            aria-label="Draft the reply"
            title="Draft the reply. It goes once you approve it."
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-ink-inverse transition-transform active:scale-[0.96]"
          >
            <Icon name="send" size={18} />
          </button>
        </form>
      )}
    </section>
  );
}
