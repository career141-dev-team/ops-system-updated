import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { repo } from "@/data/store";
import { currentMember } from "@/lib/session";
import { approveAndSend, saveDraft } from "@/app/actions";

/** One message, on its own page. Read it, change it, approve it. */
export default async function MessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;
  const message = repo.message(id);
  if (!message) notFound();

  const input = "w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";

  return (
    <div className="max-w-[760px]">
      <Link href="/" className="text-[12.5px] text-brand hover:underline">
        Back to your day
      </Link>
      <h1 className="mt-2 text-[17px] font-medium">{message.templateKey ?? "Message"}</h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        {message.channel === "email" ? "Email" : message.channel} to {message.to.join(", ")} · {message.state}
      </p>

      {msg && (
        <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>
      )}

      {message.state === "draft" ? (
        <form action={saveDraft} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="messageId" value={message.id} />
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-soft">Subject</span>
            <input name="subject" defaultValue={message.subject} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-soft">Message</span>
            <textarea name="body" defaultValue={message.body} rows={10} className={input} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper">
              Save changes
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl border border-rule bg-surface px-5 py-4">
          <p className="text-[13.5px] font-medium">{message.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-ink-soft">{message.body}</p>
          {message.note && <p className="mt-3 text-[12.5px] text-warning">{message.note}</p>}
        </div>
      )}

      {message.state === "draft" && (
        <form action={approveAndSend} className="mt-4 border-t border-rule pt-4">
          <input type="hidden" name="messageId" value={message.id} />
          <p className="text-[13px] text-ink-soft">
            Approving sends it. While the system is in test mode it goes to the test address instead,
            and the result is written here.
          </p>
          <button className="mt-3 rounded-full bg-brand px-4 py-1.5 text-[12.5px] font-medium text-white">
            Approve and send
          </button>
        </form>
      )}
    </div>
  );
}
