import { redirect } from "next/navigation";

import Chat from "@/app/Chat";
import { chatFor, desk, pinsOf } from "@/data/desk";
import { currentMember } from "@/lib/session";

/**
 * The desk assistant as a page (8 Nov, docs/31).
 *
 * On the desk it is the column on the right; on a phone there is no room
 * for a column, so this is the same thread as a page of its own, reached
 * from the bottom bar. One component, two places.
 */
export default async function ChatPage() {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const db = await desk();
  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[420px] flex-col rounded-2xl border border-rule bg-paper lg:h-[calc(100vh-4rem)]">
      <div className="border-b border-rule px-4 py-3">
        <h1 className="text-[15px] font-medium">Chat</h1>
        <p className="text-[12.5px] text-ink-soft">Ask, and get it done. Every action waits for your button.</p>
      </div>
      <Chat rows={chatFor(db, member.id)} who={member.name} pins={pinsOf(db, member.id, Date.now())} />
    </div>
  );
}
