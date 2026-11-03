import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, inboundRecent, inboundWaiting } from "@/data/desk";
import { mailboxesInWords, readerEnabled } from "@/lib/graphMail";
import { currentMember, devSignInAllowed } from "@/lib/session";
import { fileThisMail, markMailDone, pretendMailArrives, readMailNow } from "@/app/actions";

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
  // What a person may file an email against: anything we have written about.
  const subjects = [
    ...new Map(
      db.messages
        .filter((m) => m.subjectType && m.subjectId)
        .map((m) => [m.subjectType + "|" + m.subjectId, { value: m.subjectType + "|" + m.subjectId, label: m.subject }]),
    ).values(),
  ];

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const when = (at: number) => new Date(at).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <div className="flex max-w-[900px] flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-medium">What came in</h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {mailboxesInWords()} ·{" "}
            {readerEnabled() ? "read every two minutes" : "reading is switched off until the mailboxes are named"}
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
