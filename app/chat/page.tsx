import { redirect } from "next/navigation";

import Chat from "@/app/Chat";
import { PageTitle } from "@/app/ui/figma";
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
    <div className="flex flex-col gap-[22px]">
      <PageTitle title="AURA" sub="Ask, and get it done. Every action waits for your button." />
      {/* The thread needs a box of its own to scroll in; the page itself scrolls with the window. */}
      <section className="flex h-[640px] max-md:h-[calc(100dvh-17rem)] max-md:min-h-[420px] flex-col overflow-hidden rounded-[28px] bg-surface shadow-card">
      <Chat rows={chatLines(db, member.id, open)} chats={chatsOf(db, member.id)} open={open} who={member.name} pins={pinsOf(db, member.id, Date.now())} next={nextSteps(db, member, Date.now())} />
      </section>
    </div>
  );
}
