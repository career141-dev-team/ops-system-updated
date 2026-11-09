import { redirect } from "next/navigation";

import Chat from "@/app/Chat";
import { cookies } from "next/headers";

import { CHAT_COOKIE, chatLines, chatOpen, chatsOf } from "@/data/chats";
import { desk, pinsOf } from "@/data/desk";
import { nextSteps } from "@/lib/agent";
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
  const open = chatOpen(db, member.id, (await cookies()).get(CHAT_COOKIE)?.value);
  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-rule bg-gradient-to-b from-shell to-shell-sunk shadow-[0_1px_2px_rgba(22,24,26,0.05),0_18px_40px_-24px_rgba(22,24,26,0.3)] lg:h-[calc(100vh-4rem)]">
      <div className="border-b border-rule px-4 py-3">
        <h1 className="text-[15px] font-medium">Chat</h1>
        <p className="text-[12.5px] text-ink-soft">Ask, and get it done. Every action waits for your button.</p>
      </div>
      <Chat rows={chatLines(db, member.id, open)} chats={chatsOf(db, member.id)} open={open} who={member.name} pins={pinsOf(db, member.id, Date.now())} next={nextSteps(db, member, Date.now())} />
    </div>
  );
}
