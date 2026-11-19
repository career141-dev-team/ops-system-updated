import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { aiSwitches, desk } from "@/data/desk";
import { aboutWhom } from "@/lib/aboutWhom";
import { PageTitle, pillSecondary } from "@/app/ui/figma";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { buildThreads } from "@/lib/mailbox";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import ReadingPane from "../ReadingPane";

/** One whole conversation on its own page, in the Inbox's reading pane (Figma I1 151:351), every message shown. */
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
  const thread = buildThreads(db.inbound, db.messages).find((t) => t.key === threadKey);
  if (!thread) notFound();
  const company =
    (thread.clientId ? db.clients.find((c) => c.id === thread.clientId)?.name : null) ??
    (thread.about ? aboutWhom(db, thread.about.type, thread.about.id) : null);

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Conversation"
        sub={thread.items.length + (thread.items.length === 1 ? " message" : " messages")}
        right={<Link href={"/mail?t=" + encodeURIComponent(thread.key)} className={pillSecondary}>Back to the inbox</Link>}
      />
      {msg && <p className="rounded-[16px] bg-sunk px-4 py-3 t-body">{msg}</p>}
      <ReadingPane
        db={db}
        thread={thread}
        company={company}
        now={Date.now()}
        here={"/mail/" + encodeURIComponent(thread.key)}
        mayWrite={can(member, "message.approve")}
        aiOn={anyKeySet() && aiSwitches(db).on}
        aiOff={aiOffReason(anyKeySet(), aiSwitches(db).on)}
        full
      />
    </div>
  );
}
