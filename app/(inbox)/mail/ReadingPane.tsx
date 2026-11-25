import Link from "next/link";

import AuraMark from "@/app/AuraMark";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { filedTo } from "@/lib/aboutWhom";
import { fileThisMail, finishTask, markMailDone, readInbound, replyInThread } from "@/app/actions";
import { pillPrimary, pillSecondary } from "@/app/ui/figma";
import type { OpsDatabase } from "@/data/types";
import { replySubject, replyTo, threadInWords, type Thread } from "@/lib/mailbox";
import { bubbleWhen, firstName, initialsOf } from "@/lib/myWork";

const micro = "t-micro text-ink-3";

/**
 * The reading pane of Inbox I1 (151:351), used by the Inbox and by the whole-conversation page.
 * `full` shows every message in the conversation; otherwise the latest and a short history.
 */
export default function ReadingPane({
  db,
  thread,
  company,
  now,
  here,
  mayWrite,
  aiOn,
  aiOff,
  full = false,
}: {
  db: OpsDatabase;
  thread: Thread;
  company: string | null;
  now: number;
  here: string;
  mayWrite: boolean;
  aiOn: boolean;
  aiOff: string | null;
  full?: boolean;
}) {
  const who = thread.withName.replace(/@.*/, "") || thread.with[0] || "them";
  const lastIn = [...thread.items].reverse().find((i) => i.direction === "in");
  const lastMail = lastIn ? db.inbound.find((m) => m.id === lastIn.id) : undefined;
  const latest = thread.items[thread.items.length - 1];
  const shown = full ? thread.items : [latest];
  const earlier = full ? [] : thread.items.slice(0, -1).slice(-6);
  const filed = thread.about ? filedTo(db, thread.about) : null;
  const subjects = [
    ...new Map(
      db.messages.filter((m) => m.subjectType && m.subjectId).map((m) => [m.subjectType + "|" + m.subjectId, { value: m.subjectType + "|" + m.subjectId, label: m.subject }]),
    ).values(),
  ];
  const reading = lastMail
    ? db.tasks.find(
        (t) =>
          t.state === "open" &&
          t.title.startsWith("Confirm what the client said") &&
          ((t.subjectType === "inbound" && t.subjectId === lastMail.id) || (!!lastMail.subjectType && t.subjectType === lastMail.subjectType && t.subjectId === lastMail.subjectId)),
      )
    : undefined;
  const readAs = reading?.body.split("\n")[0]?.trim();
  const line = <div className="h-px w-full bg-rule" />;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 rounded-[28px] inbox-item bg-surface px-9 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk t-body-m text-ink-2">{initialsOf(who)}</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="t-body-m truncate">{who}</p>
            <p className="t-small truncate text-ink-3">{[company, thread.with[0] !== who ? thread.with[0] : null, bubbleWhen(latest.at, now)].filter(Boolean).join(" · ")}</p>
          </div>
          {lastMail?.readState === "filed" && (
            <form action={markMailDone}>
              <input type="hidden" name="inboundId" value={lastMail.id} />
              <input type="hidden" name="back" value={here} />
              <button className={pillSecondary}>Archive</button>
            </form>
          )}
          {!full && (
            <Link href={"/mail/" + encodeURIComponent(thread.key)} aria-label="Open the whole conversation" title="The whole conversation, its files and filing" className={pillSecondary + " !px-3"}>
              <Icon name="more" size={16} />
            </Link>
          )}
        </div>
        <h2 className="t-h2">{thread.subject || "(no subject)"}</h2>
        {shown.map((item) => (
          <div key={item.direction + item.id} className="flex flex-col gap-1.5">
            {full && (
              <p className="t-small text-ink-3">
                {item.direction === "in" ? item.whoName || item.who : "We wrote"} · {bubbleWhen(item.at, now)}
                {item.direction === "out" && item.state && item.state !== "sent" ? " · " + item.state : ""}
              </p>
            )}
            <p className="t-body whitespace-pre-wrap break-words text-ink-2">{item.body.trim()}</p>
            {item.attachmentNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.attachmentNames.map((name) => (
                  <span key={name} className="rounded-full border border-rule bg-sunk px-3 py-1 t-small text-ink">{name}</span>
                ))}
              </div>
            )}
            {item.direction === "out" && item.state !== "sent" && (
              <Link href={"/messages/" + item.id} className="t-small text-brand hover:underline">
                {item.state === "draft" ? "A draft: it goes once somebody approves it. Open it" : threadInWords(thread, now)}
              </Link>
            )}
          </div>
        ))}
      </div>

      {earlier.length > 0 && (
        <>
          {line}
          <div className="flex flex-col gap-2">
            <p className={micro}>Earlier in this conversation</p>
            {earlier.map((item) => (
              <p key={item.direction + item.id} className="t-small text-ink-2">
                <span className="text-ink-3">{item.direction === "out" ? "We wrote" : item.whoName || item.who} · {bubbleWhen(item.at, now)}: </span>
                <span className="line-clamp-2">{item.body.trim()}</span>
              </p>
            ))}
          </div>
        </>
      )}

      {line}
      <div className="flex flex-col gap-3.5">
        <p className={micro}>This is about</p>
        {filed ? (
          <Link href={filed.href} className="t-h3 hover:underline">{filed.said}</Link>
        ) : lastMail ? (
          <form action={fileThisMail} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="inboundId" value={lastMail.id} />
            <input type="hidden" name="back" value={here} />
            <span className="t-body text-ink-2">Not filed yet.</span>
            <select name="subject" defaultValue="" aria-label="What does it belong to?" className="min-w-0 flex-1 rounded-[10px] border border-rule bg-surface px-3 py-2 t-body">
              <option value="">What does it belong to?</option>
              {subjects.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className={pillPrimary}>File it</button>
          </form>
        ) : null}
        {lastMail && (
          <div className="flex flex-wrap items-center gap-2">
            <AuraMark size={16} />
            {readAs ? (
              <>
                <p className="t-small min-w-0 flex-1 text-violet">AURA read this as: {readAs}</p>
                <Link href={reading?.link ?? "/tasks/" + reading?.id} className={pillPrimary + " !py-1.5"}>Record it</Link>
                <form action={finishTask}>
                  <input type="hidden" name="taskId" value={reading?.id} />
                  <input type="hidden" name="outcome" value="AURA read it wrong; read by a person instead." />
                  <input type="hidden" name="back" value={here} />
                  <button className={pillSecondary + " !py-1.5"}>Not quite</button>
                </form>
              </>
            ) : aiOn ? (
              <>
                <p className="t-small min-w-0 flex-1 text-violet">AURA can read what {firstName(who)} said and propose what to record.</p>
                <form action={readInbound}>
                  <input type="hidden" name="inboundId" value={lastMail.id} />
                  <input type="hidden" name="back" value={here} />
                  <button className={pillPrimary + " !py-1.5"}>Read it</button>
                </form>
              </>
            ) : (
              <p className="t-small min-w-0 flex-1 text-ink-3">AURA cannot read this: {aiOff ?? "it is switched off."}</p>
            )}
          </div>
        )}
      </div>

      {mayWrite && (
        <>
          {line}
          <form id="reply" action={replyInThread} className="flex flex-col gap-3">
            <input type="hidden" name="threadKey" value={thread.key} />
            <input type="hidden" name="to" value={replyTo(thread).join(", ")} />
            <input type="hidden" name="subject" value={replySubject(thread.subject)} />
            <input type="hidden" name="back" value={here} />
            <p className={micro}>Reply</p>
            <textarea id="mail-reply" name="body" required rows={4} aria-label={"Reply to " + who} placeholder={"Reply to " + firstName(who)} className="w-full resize-y rounded-[10px] border border-rule bg-surface px-3.5 py-3 t-body text-ink outline-none placeholder:text-ink-3 focus:border-ink" />
            <div className="flex items-center gap-3">
              <button className={pillPrimary}>Draft the reply</button>
              <Dictate into="mail-reply" label="Speak the reply" round />
              <span className="t-small text-ink-3">It goes after you approve it.</span>
            </div>
          </form>
        </>
      )}

      {line}
      <div className="flex flex-col gap-2">
        <p className={micro}>What happens next</p>
        <p className="t-body text-ink-2">{threadInWords(thread, now)}</p>
      </div>
    </section>
  );
}
