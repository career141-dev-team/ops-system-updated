import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { aiSwitches, desk, fileIn } from "@/data/desk";
import { currentMember } from "@/lib/session";
import { messageInWords } from "@/lib/messages";
import { approveAndSend, improveDraft, recordReply, saveDraft, useImprovedDraft } from "@/app/actions";
import AiOffer from "@/app/AiOffer";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { IMPROVE_WORDS, type ImprovedDraft } from "@/lib/aiTasks";
import { BackBar, PageBox, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";

/** One message, on its own page. Read it, change it, approve it. */
export default async function MessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; proposed?: string; runId?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg, proposed: proposedJson, runId } = await searchParams;
  const db = await desk();
  const message = db.messages.find((m) => m.id === id);
  if (!message) notFound();
  // What it carries, by name: an agreement goes out as its PDF, and a person
  // approving the email has to be able to see that it is there.
  const carries = (message.attachmentFileIds ?? []).map((fileId) => fileIn(db, fileId)).filter((f) => f !== null);

  const proposed: ImprovedDraft | null = proposedJson ? (JSON.parse(proposedJson) as ImprovedDraft) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const whyAiOff = aiOffReason(anyKeySet(), aiSwitches(db).on);

  const input = figmaField;
  const card = "rounded-[24px] bg-surface p-6 shadow-float";
  const small = "rounded-full border border-rule-strong px-4 py-2 text-[14px] font-medium hover:bg-sunk";

  return (
    // Drawn like the other record pages (17 Nov): it was still in the first skeleton's style.
    <PageBox width="880" className="gap-5">
      <BackBar href="/" label="My Work" />
      <div className="flex flex-col gap-1">
        <p className="text-[14px] leading-[21px] text-ink-faint">
          {messageInWords(message)} · {message.state}
        </p>
        <h1 className="text-[32px] font-light leading-[42px] text-ink">{message.subject || message.templateKey || "Message"}</h1>
      </div>

      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {carries.length > 0 && (
        <p className="text-[14px] text-ink-soft">
          Attached:{" "}
          {carries.map((file, i) => (
            <span key={file.id}>
              {i > 0 && ", "}
              <Link href={"/api/files/" + file.id} className="text-brand hover:underline">
                {file.name}
              </Link>{" "}
              <span className="text-ink-faint">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
            </span>
          ))}
        </p>
      )}

      {message.state === "draft" ? (
        <form action={saveDraft} className={card + " flex flex-col gap-3"}>
          <input type="hidden" name="messageId" value={message.id} />
          {message.channel !== "group_post" && (
            <label className={figmaLabel}>
              Subject
              <input name="subject" defaultValue={message.subject} className={input} />
            </label>
          )}
          <label className={figmaLabel}>
            Message
            <textarea name="body" defaultValue={message.body} rows={10} className={input} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={pillSecondary}>Save changes</button>
          </div>
        </form>
      ) : (
        <div className={card}>
          <p className="text-[16px] font-medium leading-[26px] text-ink">{message.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-[16px] leading-[26px] text-ink-soft">{message.body}</p>
          {message.note && <p className="mt-3 text-[14px] text-warning">{message.note}</p>}
        </div>
      )}

      {/*
        Improving the wording (24, section 5). The offer sits beside the draft
        it would change, never on a page of its own, and it is shown even when
        the layer is off - with the reason - because a feature nobody can see
        has not been built for them (owner, 4 Nov).

        Nothing a model writes goes out unseen: the new words are offered next
        to the old ones, and "use it" or "leave it" is the sample we learn from.
      */}
      {message.state === "draft" && !proposed && (
        <div className="rounded-[20px] bg-sunk px-5 py-4">
          <p className="text-[16px] font-medium leading-[26px] text-ink">Improve the wording</p>
          <p className="mt-1 text-[14px] leading-[21px] text-ink-soft">
            The model rewrites what is already here and shows it beside your draft. It cannot add a fact, and nothing
            is saved until you press use it.
          </p>
          {aiOn ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(IMPROVE_WORDS) as (keyof typeof IMPROVE_WORDS)[]).map((how) => (
                <form key={how} action={improveDraft}>
                  <input type="hidden" name="messageId" value={message.id} />
                  <input type="hidden" name="how" value={how} />
                  <button className={small}>{IMPROVE_WORDS[how]}</button>
                </form>
              ))}
            </div>
          ) : (
            <AiOffer label="Say the same thing better · Shorter · Warmer · More formal" why={whyAiOff ?? ""} />
          )}
        </div>
      )}

      {proposed && (
        <div className="rounded-[24px] border-[1.5px] border-brand bg-surface p-6">
          <p className="text-[13.5px] font-medium">The model&rsquo;s version</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">{proposed.changed}</p>
          <p className="mt-3 text-[13.5px] font-medium">{proposed.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-[13.5px]">{proposed.body}</p>
          {proposed.notSaid?.length > 0 && (
            <p className="mt-2 text-[12px] text-warning">
              It could not say: {proposed.notSaid.join("; ")}. Check that against your own draft before you use it.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={useImprovedDraft}>
              <input type="hidden" name="messageId" value={message.id} />
              <input type="hidden" name="runId" value={runId ?? ""} />
              <input type="hidden" name="subject" value={proposed.subject} />
              <input type="hidden" name="body" value={proposed.body} />
              <input type="hidden" name="use" value="yes" />
              <button className={pillPrimary}>Use it</button>
            </form>
            <form action={useImprovedDraft}>
              <input type="hidden" name="messageId" value={message.id} />
              <input type="hidden" name="runId" value={runId ?? ""} />
              <input type="hidden" name="use" value="no" />
              <button className={pillSecondary}>Leave mine</button>
            </form>
          </div>
        </div>
      )}

      {message.subjectType && message.subjectId && (
        <form action={recordReply} className="rounded-[20px] bg-sunk px-5 py-4">
          <input type="hidden" name="subjectType" value={message.subjectType} />
          <input type="hidden" name="subjectId" value={message.subjectId} />
          <input type="hidden" name="back" value={"/messages/" + message.id} />
          <p className="text-[16px] font-medium leading-[26px] text-ink">Has the client answered?</p>
          <p className="mt-1 text-[14px] leading-[21px] text-ink-soft">
            Saying so stops every chase for this one at once. The reader will do this by itself
            once the Ops mailbox is connected.
          </p>
          <button className={small + " mt-3 bg-surface"}>They answered, stop chasing</button>
        </form>
      )}

      {message.state === "draft" && (
        <form action={approveAndSend} className="flex flex-col gap-3 border-t border-rule pt-5">
          <input type="hidden" name="messageId" value={message.id} />
          <p className="text-[14px] leading-[21px] text-ink-soft">
            {message.channel === "group_post"
              ? "Nothing can send this. The group was made on somebody's phone, and Meta gives no way for a system to join a group it did not create. Approve it, copy it and post it from your phone - that it is yours to post is written here."
              : "Approving sends it. While the system is in test mode it goes to the test address instead, and the result is written here."}
          </p>
          <button className={pillPrimary + " self-start"}>
            {message.channel === "group_post" ? "Approve it, and post it myself" : "Approve and send"}
          </button>
        </form>
      )}
    </PageBox>
  );
}
