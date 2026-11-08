import Link from "next/link";
import { redirect } from "next/navigation";

import { aiSwitches, desk, inboundRecent, inboundWaiting } from "@/data/desk";
import AiOffer from "@/app/AiOffer";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { mailboxesInWords, readerEnabled } from "@/lib/graphMail";
import { currentMember, devSignInAllowed } from "@/lib/session";
import { fileThisMail, markMailDone, pretendMailArrives, readMailNow, readInbound, writeNewMessage } from "@/app/actions";
import Part from "@/app/Part";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { can } from "@/lib/roles";

/**
 * What came in (07, the mailbox part of the inbox screens).
 *
 * Two lists, in the order they matter: what the system could not place and is
 * waiting on a person, then everything it has seen lately with how it was
 * matched. Nothing is guessed at, so "needs filing" is a normal part of the
 * day rather than a failure.
 */
/** How each match is said on the screen: what we matched on, in plain words. */
const MATCH_SAID: Record<string, string> = {
  reference: "matched by our reference",
  thread: "matched by the thread",
  house: "matched by the subject",
  domain: "matched by the sender's company",
  manual: "filed by hand",
  none: "not placed",
};

export default async function MailPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;

  const db = await desk();
  const waiting = inboundWaiting(db);
  const recent = inboundRecent(db);
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);
  // What a person may file an email against: anything we have written about.
  const subjects = [
    ...new Map(
      db.messages
        .filter((m) => m.subjectType && m.subjectId)
        .map((m) => [m.subjectType + "|" + m.subjectId, { value: m.subjectType + "|" + m.subjectId, label: m.subject }]),
    ).values(),
  ];

  // Every conversation, ours and theirs, newest first (24, section 7).
  const now = Date.now();
  const threads = buildThreads(db.inbound, db.messages);
  const answerUs = threads.filter((t) => t.hasDraft || t.waitingOnUs || t.hasTrouble);
  const quiet = threads.filter((t) => !(t.hasDraft || t.waitingOnUs || t.hasTrouble));
  const mayWrite = can(member, "message.approve");
  const writeTo = [
    ...new Map(
      db.clients
        .filter((c) => c.stage !== "closed")
        .map((c) => ["client|" + c.id, { value: "client|" + c.id, label: "Client · " + c.name }]),
    ).values(),
    ...db.positions.map((p) => ({ value: "position|" + p.id, label: "Position · " + p.title })),
  ].slice(0, 200);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const when = (at: number) => new Date(at).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <div className="flex max-w-[900px] flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-medium">What came in</h2>
          <p className="mt-0.5 break-words text-[13px] text-ink-soft">
            {mailboxesInWords()} ·{" "}
            {readerEnabled() ? "read every five minutes by the clock, and now if you press the button" : "reading is switched off until the mailboxes are named"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={readMailNow}>
            <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              Read the mailbox now
            </button>
          </form>
          {devSignInAllowed() && (
            <form action={pretendMailArrives}>
              <input type="hidden" name="kind" value="reply" />
              <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
                Pretend a client replies
              </button>
            </form>
          )}
        </div>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {mayWrite && (
        <Part title="Write to somebody" says="A plain email, from your own address" open={false}>
          <p className="text-[13px] text-ink-soft">
            For the message that belongs to no step of the flow - the one people still opened Outlook for. It is
            drafted like every other message, and nothing goes until you approve it.
          </p>
          <form action={writeNewMessage} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="back" value="/mail" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[12px] text-ink-soft">To</span>
                <input name="to" placeholder="hr@example.test, md@example.test" className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-ink-soft">About, so it is findable later</span>
                <select name="about" className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]" defaultValue="">
                  <option value="">Nothing in particular</option>
                  {writeTo.map((thing) => (
                    <option key={thing.value} value={thing.value}>
                      {thing.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-soft">Subject</span>
              <input name="subject" className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-soft">Message</span>
              <textarea name="body" rows={7} className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]" />
            </label>
            <button className="self-start rounded-full bg-brand px-4 py-1.5 text-[13px] font-medium text-white">
              Draft it
            </button>
          </form>
        </Part>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-medium">Conversations waiting on us</h2>
          <span className="text-[12.5px] text-ink-soft">{answerUs.length}</span>
        </div>
        {answerUs.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">Nobody is waiting for an answer.</p>
        )}
        {answerUs.map((thread) => (
          <div key={thread.key} data-row tabIndex={-1} className="rounded-lg border-t border-rule py-3 outline-none first:border-t-0 focus:bg-sunk focus:ring-1 focus:ring-brand/40">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <Link href={"/mail/" + encodeURIComponent(thread.key)} data-open className="text-[13.5px] text-brand hover:underline">
                {thread.subject}
              </Link>
              <span className="text-[12px] text-ink-faint">{thread.withName}</span>
              <span className="ml-auto text-[12px] text-ink-faint">
                {thread.items.length} {thread.items.length === 1 ? "message" : "messages"}
              </span>
            </div>
            <p className={"mt-0.5 text-[12.5px] " + (thread.hasTrouble ? "text-danger" : "text-ink-soft")}>
              {threadInWords(thread, now)}
            </p>
          </div>
        ))}
      </section>

      {quiet.length > 0 && (
        <Part title="The rest of the conversations" says={quiet.length + " with nothing waiting"} open={false}>
          {quiet.map((thread) => (
            <div key={thread.key} data-row tabIndex={-1} className="rounded-lg border-t border-rule py-2.5 outline-none first:border-t-0 focus:bg-sunk focus:ring-1 focus:ring-brand/40">
              <Link href={"/mail/" + encodeURIComponent(thread.key)} data-open className="text-[13.5px] text-brand hover:underline">
                {thread.subject}
              </Link>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {thread.withName} · {threadInWords(thread, now)}
              </p>
            </div>
          ))}
        </Part>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Needs filing</h2>
        {waiting.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">Nothing is waiting. Everything that arrived found its place.</p>
        )}
        {waiting.map((mail) => (
          <div key={mail.id} className="border-t border-rule py-3 first:border-t-0">
            <p className="text-[13.5px]">{mail.subject || "(no subject)"}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {mail.fromName || mail.from} · to {mail.mailbox} · {when(mail.receivedAt)} · {mail.note}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-ink-soft">{mail.body.slice(0, 300)}</p>
            <form action={fileThisMail} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="inboundId" value={mail.id} />
              <select name="subject" className="rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12.5px]" defaultValue="">
                <option value="">What does it belong to?</option>
                {subjects.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">File it</button>
            </form>
            {!aiOn && <AiOffer label="Read what they said" why={whyAiOff ?? ""} />}
            {aiOn && (
              <form action={readInbound} className="mt-2">
                <input type="hidden" name="inboundId" value={mail.id} />
                <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                  Read what they said
                </button>
              </form>
            )}
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Lately</h2>
        {recent.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing has arrived yet.</p>}
        {recent.map((mail) => (
          <div key={mail.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-2.5 first:border-t-0">
            <span className="min-w-0 flex-1 text-[13.5px]">{mail.subject || "(no subject)"}</span>
            <span className="text-[12px] text-ink-faint">
              {MATCH_SAID[mail.matchedBy]}
            </span>
            <span className="text-[12px] text-ink-faint">{mail.readState}</span>
            {mail.readState === "filed" && (
              <form action={markMailDone}>
                <input type="hidden" name="inboundId" value={mail.id} />
                <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                  Dealt with
                </button>
              </form>
            )}
          </div>
        ))}
      </section>

      <p className="text-[12.5px] text-ink-faint">
        A reply we are sure about stops that chase by itself. Anything else waits here rather than being guessed at.{" "}
        <Link href="/" className="text-brand hover:underline">
          Back to your day
        </Link>
      </p>
    </div>
  );
}
