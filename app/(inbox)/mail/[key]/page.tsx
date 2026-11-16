import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { desk, fileIn, inboundRecent } from "@/data/desk";
import NextStep from "@/app/NextStep";
import Part from "@/app/Part";
import { buildThreads, replySubject, replyTo, threadInWords } from "@/lib/mailbox";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { fileThisMail, markMailDone, replyInThread } from "@/app/actions";

/**
 * One conversation, both directions, on its own page (24, section 7).
 *
 * This is the screen that was missing while people kept Outlook open: what
 * they wrote, what we wrote, in order, with the answer written here rather
 * than somewhere we never see. The reply is a draft like every other message,
 * so the one way out is unchanged.
 */
export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { key } = await params;
  const { msg } = await searchParams;
  const threadKey = decodeURIComponent(key);

  const db = await desk();
  const now = Date.now();
  const thread = buildThreads(db.inbound, db.messages).find((t) => t.key === threadKey);
  if (!thread) notFound();

  const mayWrite = can(member, "message.approve");
  const to = replyTo(thread);
  const lastIn = [...thread.items].reverse().find((item) => item.direction === "in");
  const unfiled = lastIn && !thread.about;
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const field = "w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";

  // What this conversation is about, for filing it in one go.
  const things: { value: string; label: string }[] = [
    ...db.leads.map((lead) => ({ value: "lead|" + lead.id, label: "Lead · " + lead.company })),
    ...db.clients.map((client) => ({ value: "client|" + client.id, label: "Client · " + client.name })),
    ...db.clientSets.map((set) => ({ value: "clientSet|" + set.id, label: "Set · " + set.name })),
    ...db.invoices.map((invoice) => ({ value: "invoice|" + invoice.id, label: "Invoice · " + invoice.number })),
  ].slice(0, 200);

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/mail" className="text-[12.5px] text-brand hover:underline">
          Back to the mail
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{thread.subject}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {thread.with.join(", ") || thread.withName}
          {thread.withName && !thread.with.some((address) => address === thread.withName)
            ? " · " + thread.withName
            : ""}
          {thread.about && (
            <>
              {" · "}
              <Link
                href={"/" + aboutPath(thread.about.type) + "/" + thread.about.id}
                className="text-brand hover:underline"
              >
                filed against the {aboutWord(thread.about.type)}
              </Link>
            </>
          )}
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <NextStep
        where={thread.items.length + (thread.items.length === 1 ? " message" : " messages")}
        waiting={threadInWords(thread, now)}
        clock={
          unfiled
            ? "Nothing of ours is watching this conversation until it is filed against something."
            : null
        }
      />

      <section className="flex flex-col gap-3">
        {thread.items.map((item) => (
          <article
            key={item.direction + item.id}
            className={
              "rounded-2xl border px-5 py-4 " +
              (item.direction === "in" ? "border-rule bg-surface" : "border-rule bg-paper")
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[13.5px] font-medium">
                {item.direction === "in" ? item.whoName || item.who : "We wrote"}
              </span>
              <span className="text-[12px] text-ink-faint">
                {whenLocal(item.at)}
                {item.direction === "out" && item.state !== "sent" ? " · " + item.state : ""}
                {item.attachments > 0
                  ? " · " + item.attachments + (item.attachments === 1 ? " file" : " files")
                  : ""}
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{item.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{item.body}</p>
            {item.attachmentNames.length > 0 && (
              <p className="mt-2 text-[12.5px] text-ink-soft">Files: {item.attachmentNames.join(", ")}</p>
            )}
            {item.direction === "out" && item.state !== "sent" && (
              <Link href={"/messages/" + item.id} className="mt-2 inline-block text-[12.5px] text-brand hover:underline">
                Open the draft
              </Link>
            )}
            {item.direction === "in" && (
              <form action={markMailDone} className="mt-2">
                <input type="hidden" name="inboundId" value={item.id} />
                <button className="rounded-full border border-rule-strong px-3 py-1 text-[12px] hover:bg-paper">
                  Mark this one dealt with
                </button>
              </form>
            )}
          </article>
        ))}
      </section>

      {mayWrite && (
        <form action={replyInThread} className="rounded-2xl border border-rule bg-surface px-5 py-4">
          <input type="hidden" name="threadKey" value={thread.key} />
          <p className="text-[14.5px] font-medium">Reply</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            It is drafted, not sent: you read it once more and approve it, like every other message. It goes from
            your own address and lands under the email they wrote.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-soft">To</span>
              <input name="to" defaultValue={to.join(", ")} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-soft">Subject</span>
              <input name="subject" defaultValue={replySubject(thread.subject)} className={field} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] text-ink-soft">Message</span>
            <textarea name="body" rows={7} className={field} />
          </label>
          <button className="mt-3 rounded-full bg-brand px-4 py-1.5 text-[13px] font-medium text-ink-inverse">
            Draft the reply
          </button>
        </form>
      )}

      {lastIn && (
        <Part
          title="What this is about"
          says={thread.about ? "Filed against the " + aboutWord(thread.about.type) : "Not filed against anything yet"}
          open={!thread.about}
        >
          <p className="text-[13px] text-ink-soft">
            Filing it stops the chases on that thing at once, and puts this conversation on its page.
          </p>
          <form action={fileThisMail} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="inboundId" value={lastIn.id} />
            <select name="subject" className="rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]">
              <option value="">Choose what it belongs to</option>
              {things.map((thing) => (
                <option key={thing.value} value={thing.value}>
                  {thing.label}
                </option>
              ))}
            </select>
            <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              File it
            </button>
          </form>
        </Part>
      )}

      <Part title="The files on it" says={filesSaid(thread.items)} open={false}>
        {thread.items.flatMap((item) => (item.attachments ? [item] : [])).length === 0 ? (
          <p className="text-[13px] text-ink-soft">Nothing was attached to anything on this conversation.</p>
        ) : thread.items.some((item) => item.attachmentNames.length > 0) ? (
          <ul className="list-disc pl-5 text-[13px] text-ink-soft">
            {thread.items.flatMap((item) => item.attachmentNames.map((name) => <li key={item.id + name}>{name}</li>))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-soft">
            Files sent with a message are kept with the message, exactly as the client received them. Open the
            message to see them.
          </p>
        )}
      </Part>
    </div>
  );
}

function aboutWord(type: string): string {
  const words: Record<string, string> = {
    lead: "lead",
    client: "client",
    clientSet: "set",
    invoice: "invoice",
    esa: "agreement",
    position: "position",
    interview: "interview",
    placement: "placement",
  };
  return words[type] ?? type;
}

function aboutPath(type: string): string {
  const paths: Record<string, string> = {
    lead: "leads",
    client: "clients",
    clientSet: "sets",
    invoice: "invoices",
    esa: "leads",
    position: "positions",
    interview: "interviews",
    placement: "placements",
  };
  return paths[type] ?? type;
}

function filesSaid(items: { attachments: number }[]): string {
  const count = items.reduce((sum, item) => sum + item.attachments, 0);
  return count === 0 ? "None" : count + (count === 1 ? " file" : " files");
}
