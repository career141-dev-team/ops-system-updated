import Link from "next/link";
import { redirect } from "next/navigation";

import { aiSwitches, desk } from "@/data/desk";
import AuraMark from "@/app/AuraMark";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { Chip, SideRow, pane, sideCaption } from "@/app/(inbox)/InboxHead";
import InboxHead from "@/app/(inbox)/InboxHead";
import { aboutWhom, filedTo } from "@/app/MessagesView";
import { PageBox, figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { LABELS, MAIL_FOLDERS, inFolder, labelFor, matchesWords } from "@/lib/inboxView";
import { mailboxesInWords, readerEnabled } from "@/lib/graphMail";
import { buildThreads, replySubject, replyTo, threadInWords, type Thread } from "@/lib/mailbox";
import { bubbleWhen, firstName, initialsOf, shortWhen } from "@/lib/myWork";
import { can, seesWholeDesk } from "@/lib/roles";
import { currentMember, devSignInAllowed } from "@/lib/session";
import {
  fileThisMail,
  finishTask,
  markMailDone,
  pretendMailArrives,
  readInbound,
  readMailNow,
  replyInThread,
  writeNewMessage,
} from "@/app/actions";

const TONES = ["bg-brand-tint text-brand", "bg-warn-soft text-warn", "bg-violet-soft text-violet", "bg-info-soft text-info"];

/**
 * The Inbox (17 Nov, Figma 395:11299): the mailbox down the side, the conversations in the middle, the one chosen on
 * the right, read as an email.
 *
 * Everything is a URL - the folder (`f`), the label (`label`), whose mail (`box`), the words (`q`) and the chosen
 * conversation (`t`) - so a link always opens the same view, and nothing opens over the page. Writing is the same as
 * everywhere: a reply or a new message is a draft, and it waits in To approve. The folders are the ones Ops can answer
 * from its own records (see src/lib/inboxView.ts): there are no stars or hand-made labels to show.
 */
export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; box?: string; f?: string; label?: string; q?: string; t?: string; compose?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const sp = await searchParams;

  const all = await desk();
  const now = Date.now();
  // Whose mail (9 Nov; the owner's decision 1): your own box, the shared boxes, or everything.
  const people = new Set(all.members.map((m) => m.email.toLowerCase()));
  const mine = (i: { mailbox: string }) => i.mailbox.toLowerCase() === member.email.toLowerCase();
  const shared = (i: { mailbox: string }) => !people.has(i.mailbox.toLowerCase());
  const haveOwn = all.inbound.some(mine);
  const box = sp.box === "shared" || sp.box === "all" || sp.box === "mine" ? sp.box : seesWholeDesk(member) || !haveOwn ? "all" : "mine";
  const keep = (i: { mailbox: string }) => (box === "mine" ? mine(i) : box === "shared" ? shared(i) : true);
  const db = { ...all, inbound: all.inbound.filter(keep) };

  const folder = MAIL_FOLDERS.some((f) => f.key === sp.f) ? (sp.f as string) : "inbox";
  const label = LABELS.some((l) => l.key === sp.label) ? (sp.label as string) : null;
  const q = (sp.q ?? "").trim();
  const readState = new Map(db.inbound.map((i) => [i.id, i.readState]));

  const threads = buildThreads(db.inbound, db.messages);
  const companyOf = (t: Thread) =>
    (t.clientId ? db.clients.find((c) => c.id === t.clientId)?.name : null) ?? (t.about ? aboutWhom(db, t.about.type, t.about.id) : null);
  const count = (f: string) => threads.filter((t) => inFolder(t, f, readState)).length;
  const listed = threads.filter(
    (t) =>
      inFolder(t, folder, readState) &&
      (!label || labelFor(t.about?.type) === label) &&
      (!q || matchesWords(q, t.withName, t.subject, companyOf(t), ...t.items.map((i) => i.body))),
  );
  const chosen = sp.compose ? null : (listed.find((t) => t.key === sp.t) ?? threads.find((t) => t.key === sp.t) ?? listed[0] ?? null);

  // Every link keeps the rest of the view; `over` changes one part of it.
  const view = { box: sp.box, f: folder === "inbox" ? undefined : folder, label: label ?? undefined, q: q || undefined, t: chosen?.key };
  const href = (over: Partial<Record<keyof typeof view | "compose", string | undefined>>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...view, ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return "/mail" + (s ? "?" + s : "");
  };
  const here = href({});
  const mayWrite = can(member, "message.approve");
  const aiOn = anyKeySet() && aiSwitches(db).on;

  return (
    <PageBox width="full" className="gap-5 md:flex-1">
      <InboxHead
        title="Inbox"
        on="mail"
        count={(() => {
          const n = threads.filter((t) => inFolder(t, "inbox", readState)).length;
          return n + (n === 1 ? " conversation" : " conversations");
        })()}
        action={
          mayWrite ? (
            <Link href={href({ compose: "1", t: undefined })} className={pillPrimary}>
              <Icon name="plus" size={16} />
              New message
            </Link>
          ) : undefined
        }
      />

      {sp.msg && <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{sp.msg}</p>}

      <div className="grid min-h-0 grid-cols-1 gap-4 md:flex-1 lg:grid-cols-[220px_minmax(300px,380px)_1fr]">
        {/* The mailbox. */}
        <aside className={pane + " gap-1 p-3 lg:overflow-y-auto"}>
          <p className={sideCaption + " pb-1 pt-2"}>Mailbox</p>
          {MAIL_FOLDERS.map((f) => (
            <SideRow key={f.key} href={href({ f: f.key === "inbox" ? undefined : f.key, t: undefined })} label={f.label} count={count(f.key)} on={folder === f.key} />
          ))}

          <div className="mx-3 my-3 border-t border-rule" />
          <p className={sideCaption + " pb-2"}>Labels</p>
          <div className="flex flex-wrap gap-2 px-3">
            {LABELS.map((l) => (
              <Chip key={l.key} href={href({ label: label === l.key ? undefined : l.key, t: undefined })} label={l.label} on={label === l.key} />
            ))}
          </div>

          <div className="mx-3 my-3 border-t border-rule" />
          <p className={sideCaption + " pb-2"}>Whose mail</p>
          <div className="flex flex-col gap-0.5">
            {([
              ["mine", "Your mailbox"],
              ["shared", "Shared boxes"],
              ["all", "Everything"],
            ] as const).map(([key, words]) => (
              <SideRow key={key} href={href({ box: key, t: undefined })} label={words} on={box === key} />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2 px-3 pb-1 pt-4">
            <p className="text-[12px] leading-4 text-ink-faint" title={mailboxesInWords()}>
              {readerEnabled() ? "Read every five minutes." : "Reading mail is switched off until the mailboxes are named."}
            </p>
            <form action={readMailNow}>
              <button className="text-[12px] font-medium text-brand hover:underline">Read the mailbox now</button>
            </form>
            {devSignInAllowed() && (
              <form action={pretendMailArrives}>
                <input type="hidden" name="kind" value="reply" />
                <button className="text-[12px] font-medium text-ink-soft hover:text-ink">Pretend a client replies</button>
              </form>
            )}
          </div>
        </aside>

        {/* The conversations. */}
        <section className={pane + " p-4 lg:overflow-hidden"}>
          <div className="px-1">
            <h2 className="text-[18px] font-medium leading-[26px] text-ink">{label ? LABELS.find((l) => l.key === label)?.label : MAIL_FOLDERS.find((f) => f.key === folder)?.label}</h2>
            <p className="text-[12px] leading-4 text-ink-faint">{listed.length} {listed.length === 1 ? "conversation" : "conversations"}</p>
          </div>
          <form action="/mail" className="mt-3 flex items-center gap-2 rounded-full bg-sunk px-4 py-2.5">
            {Object.entries(view).map(([k, v]) => (k !== "q" && k !== "t" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <Icon name="search" size={14} className="text-ink-faint" />
            <input name="q" defaultValue={q} placeholder="Search messages" aria-label="Search messages" className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint" />
          </form>
          <nav aria-label="Conversations" className="mt-3 flex min-h-0 flex-col gap-1 lg:overflow-y-auto">
            {listed.length === 0 && <p className="px-3 py-4 text-[14px] text-ink-soft">{q ? "Nothing matches that." : "Nothing in this folder."}</p>}
            {listed.map((t, i) => {
              const last = t.items[t.items.length - 1];
              const isNew = t.items.some((it) => it.direction === "in" && readState.get(it.id) === "new");
              const company = companyOf(t);
              return (
                <Link
                  key={t.key}
                  href={href({ t: t.key, compose: undefined })}
                  scroll={false}
                  data-row
                  data-open
                  aria-current={t.key === chosen?.key ? "page" : undefined}
                  className={"flex gap-3 rounded-[16px] p-3 transition-colors " + (t.key === chosen?.key ? "bg-brand-tint" : "border-b border-rule hover:bg-sunk")}
                >
                  <span className={"flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium " + TONES[i % TONES.length]}>{initialsOf(t.withName)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={"truncate text-[14px] font-medium leading-[21px] " + (t.key === chosen?.key ? "text-brand" : "text-ink")}>{t.withName.replace(/@.*/, "") || t.with[0]}</span>
                    <span className="truncate text-[12px] leading-4 text-ink-faint">{[company, t.subject].filter(Boolean).join(" · ")}</span>
                    <span className="truncate text-[12px] leading-4 text-ink-soft">{(last?.body ?? "").split("\n").find((l) => l.trim())?.trim() || last?.subject}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[11px] leading-4 text-ink-faint">{shortWhen(t.lastAt, now)}</span>
                    {isNew && <span aria-label="Not read" className="size-1.5 rounded-full bg-brand" />}
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        {/* The one chosen, or a new message. */}
        <section className={pane + " p-5 lg:overflow-y-auto"}>
          {sp.compose && mayWrite ? (
            <Compose db={db} back={href({ compose: "1" })} />
          ) : chosen ? (
            <Reading key={chosen.key} db={db} thread={chosen} company={companyOf(chosen)} now={now} here={here} mayWrite={mayWrite} aiOn={aiOn} aiOff={aiOffReason(anyKeySet(), aiSwitches(db).on)} />
          ) : (
            <p className="m-auto text-[14px] text-ink-soft">A conversation opens here when somebody writes to us.</p>
          )}
        </section>
      </div>
    </PageBox>
  );
}

function Reading({
  db,
  thread,
  company,
  now,
  here,
  mayWrite,
  aiOn,
  aiOff,
}: {
  db: Awaited<ReturnType<typeof desk>>;
  thread: Thread;
  company: string | null;
  now: number;
  here: string;
  mayWrite: boolean;
  aiOn: boolean;
  aiOff: string | null;
}) {
  const who = thread.withName.replace(/@.*/, "") || thread.with[0] || "them";
  const lastIn = [...thread.items].reverse().find((i) => i.direction === "in");
  const lastMail = lastIn ? db.inbound.find((m) => m.id === lastIn.id) : undefined;
  const latest = thread.items[thread.items.length - 1];
  const earlier = thread.items.slice(0, -1).slice(-8);
  const filed = thread.about ? filedTo(db, thread.about) : null;
  // What a person may file an email against: anything we have written about (as the old inbox did).
  const subjects = [
    ...new Map(
      db.messages.filter((m) => m.subjectType && m.subjectId).map((m) => [m.subjectType + "|" + m.subjectId, { value: m.subjectType + "|" + m.subjectId, label: m.subject }]),
    ).values(),
  ];
  // What AURA read in their last message: the open task `readInbound` left for it, if there is one.
  const reading = lastMail
    ? db.tasks.find(
        (t) =>
          t.state === "open" &&
          t.title.startsWith("Confirm what the client said") &&
          ((t.subjectType === "inbound" && t.subjectId === lastMail.id) || (!!lastMail.subjectType && t.subjectType === lastMail.subjectType && t.subjectId === lastMail.subjectId)),
      )
    : undefined;
  const readAs = reading?.body.split("\n")[0]?.trim();
  const btn = "rounded-[12px] border border-rule px-4 py-2 text-[14px] leading-[21px] text-ink hover:bg-sunk";

  return (
    <div className="rise flex flex-col gap-4">
      <header className="flex flex-wrap items-start gap-3 border-b border-rule pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-medium text-brand">{initialsOf(who)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div>
            <p className="truncate text-[16px] font-medium leading-[26px] text-ink">{who}</p>
            <p className="truncate text-[12px] leading-4 text-ink-faint">{[company, thread.with[0] !== who ? thread.with[0] : null, "Email"].filter(Boolean).join(" · ")}</p>
          </div>
          {filed ? (
            <Link href={filed?.href ?? "/mail/" + encodeURIComponent(thread.key)} className="self-start rounded-[8px] bg-brand-tint px-3 py-1 text-[12px] font-medium text-brand hover:underline">
              Filed to {filed?.said}
            </Link>
          ) : (
            <span className="self-start rounded-[8px] bg-warn-soft px-3 py-1 text-[12px] font-medium text-warn">Not filed yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastMail?.readState === "filed" && (
            <form action={markMailDone}>
              <input type="hidden" name="inboundId" value={lastMail.id} />
              <input type="hidden" name="back" value={here} />
              <button className={btn}>Archive</button>
            </form>
          )}
          <Link href={"/mail/" + encodeURIComponent(thread.key)} title="The whole conversation, its files and filing" aria-label="More" className={btn + " px-3"}>
            <Icon name="more" size={16} />
          </Link>
        </div>
      </header>

      {/* Not placed yet: say what it belongs to, here. */}
      {lastMail && lastMail.readState === "new" && (
        <form action={fileThisMail} className="flex flex-wrap items-center gap-2 rounded-[16px] bg-warn-soft px-4 py-3">
          <input type="hidden" name="inboundId" value={lastMail.id} />
          <input type="hidden" name="back" value={here} />
          <span className="text-[14px] text-ink">The system could not place this one.</span>
          <select name="subject" defaultValue="" className="min-w-0 flex-1 rounded-[10px] border border-rule bg-surface px-3 py-1.5 text-[14px]">
            <option value="">What does it belong to?</option>
            {subjects.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-ink px-3.5 py-1.5 text-[14px] font-medium text-ink-inverse">File it</button>
        </form>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-ink-faint">Email · {shortWhen(latest.at, now)}</p>
          <h2 className="text-[22px] leading-[30px] text-ink">{thread.subject || "(no subject)"}</h2>
        </div>
        {mayWrite && (
          <a href="#reply" className="rounded-[12px] bg-brand px-4 py-2 text-[14px] font-medium leading-[21px] text-ink-inverse">
            Reply
          </a>
        )}
      </div>

      <dl className="grid grid-cols-[48px_1fr_auto] gap-x-3 gap-y-1 border-b border-rule pb-3 text-[13px] leading-5">
        <dt className="text-ink-faint">From</dt>
        <dd className="truncate text-ink">{latest.direction === "in" ? `${latest.whoName || latest.who} <${latest.who}>` : "Us"}</dd>
        <dd className="text-right text-ink-faint">{bubbleWhen(latest.at, now)}</dd>
        <dt className="text-ink-faint">To</dt>
        <dd className="col-span-2 truncate text-ink">{latest.direction === "in" ? (lastMail?.mailbox ?? "us") : latest.who}</dd>
      </dl>

      <p className="whitespace-pre-wrap break-words text-[14px] leading-[24px] text-ink">{latest.body.trim()}</p>
      {latest.direction === "in" && lastMail?.attachments && lastMail.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lastMail.attachments.map((name) => (
            <span key={name} className="flex items-center gap-3 rounded-[14px] border border-rule bg-sunk px-4 py-3 text-[13px] text-ink">
              <span className="rounded-[6px] bg-surface px-1.5 py-1 text-[10px] font-medium text-ink-soft">{name.split(".").pop()?.toUpperCase()}</span>
              {name}
            </span>
          ))}
        </div>
      )}
      {latest.direction === "out" && latest.state !== "sent" && <p className="text-[12px] text-warn">{latest.state === "draft" ? "A draft: it goes once somebody approves it." : threadInWords(thread, now)}</p>}

      {earlier.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-ink-faint">Earlier in this conversation</p>
          {earlier.map((item) => (
            <div key={item.direction + item.id} className={"flex " + (item.direction === "out" ? "justify-end" : "justify-start")}>
              <div className={"max-w-[85%] rounded-[16px] px-4 py-2.5 " + (item.direction === "out" ? "bg-brand-tint" : "bg-sunk")}>
                <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-[21px] text-ink">{item.body.trim()}</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-faint">{bubbleWhen(item.at, now)}{item.direction === "out" && item.state && item.state !== "sent" ? " · " + item.state : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AURA, on the last thing they said: it proposes, a person records. */}
      {lastMail && (
        <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-brand-tint px-4 py-3">
          <AuraMark size={28} />
          {readAs ? (
            <>
              <p className="min-w-0 flex-1 text-[13px] text-ink">AURA read this as: {readAs}</p>
              <Link href={reading?.link ?? "/tasks/" + reading?.id} className="rounded-[10px] bg-ink px-4 py-1.5 text-[13px] font-medium text-ink-inverse">
                Record it
              </Link>
              <form action={finishTask}>
                <input type="hidden" name="taskId" value={reading?.id} />
                <input type="hidden" name="outcome" value="AURA read it wrong; read by a person instead." />
                <input type="hidden" name="back" value={here} />
                <button className="rounded-[10px] border border-rule bg-surface px-4 py-1.5 text-[13px] font-medium text-ink">Not quite</button>
              </form>
            </>
          ) : aiOn ? (
            <>
              <p className="min-w-0 flex-1 text-[13px] text-ink">AURA can read what {firstName(who)} said and propose what to record.</p>
              <form action={readInbound}>
                <input type="hidden" name="inboundId" value={lastMail.id} />
                <input type="hidden" name="back" value={here} />
                <button className="rounded-[10px] bg-ink px-4 py-1.5 text-[13px] font-medium text-ink-inverse">Read it</button>
              </form>
            </>
          ) : (
            <p className="min-w-0 flex-1 text-[13px] text-ink-faint">AURA cannot read this: {aiOff ?? "it is switched off."}</p>
          )}
        </div>
      )}

      {/* The reply: a draft like every other message, so it waits in To approve. */}
      {mayWrite && (
        <form id="reply" action={replyInThread} className="flex items-center gap-3 rounded-[20px] border border-rule p-2 pl-4">
          <input type="hidden" name="threadKey" value={thread.key} />
          <input type="hidden" name="to" value={replyTo(thread).join(", ")} />
          <input type="hidden" name="subject" value={replySubject(thread.subject)} />
          <input type="hidden" name="back" value={here} />
          <input id="mail-reply" name="body" required autoComplete="off" placeholder={"Reply to " + firstName(who) + " — it sends after you approve"} aria-label={"Reply to " + who} className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint" />
          <Dictate into="mail-reply" label="Speak the reply" round />
          <button aria-label="Draft the reply" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-ink-inverse">
            <Icon name="send" size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

/** A plain email from your own address, for the message that belongs to no step of the flow. A draft, like the rest. */
function Compose({ db, back }: { db: Awaited<ReturnType<typeof desk>>; back: string }) {
  const writeTo = [
    ...db.clients.filter((c) => c.stage !== "closed").map((c) => ({ value: "client|" + c.id, label: "Client · " + c.name })),
    ...db.positions.map((p) => ({ value: "position|" + p.id, label: "Position · " + p.title })),
  ].slice(0, 200);
  return (
    <form action={writeNewMessage} className="rise flex flex-col gap-3.5">
      <input type="hidden" name="back" value={back} />
      <div>
        <h2 className="text-[22px] leading-[30px] text-ink">New message</h2>
        <p className="text-[13px] text-ink-soft">From your own address. It is drafted like every other message, and nothing goes until you approve it.</p>
      </div>
      <label className={figmaLabel}>
        To
        <input name="to" placeholder="hr@example.test, md@example.test" className={figmaField} />
      </label>
      <label className={figmaLabel}>
        About, so it is findable later
        <select name="about" defaultValue="" className={figmaField}>
          <option value="">Nothing in particular</option>
          {writeTo.map((thing) => (
            <option key={thing.value} value={thing.value}>
              {thing.label}
            </option>
          ))}
        </select>
      </label>
      <label className={figmaLabel}>
        Subject
        <input name="subject" className={figmaField} />
      </label>
      <label className={figmaLabel}>
        Message
        <textarea name="body" rows={8} className={figmaField} />
      </label>
      <div className="flex items-center gap-3">
        <button className={pillPrimary}>Draft it</button>
        <Link href="/mail" className="px-3 text-[14px] font-medium text-ink-soft hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
