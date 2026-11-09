import "server-only";

import { convexMutation, usingConvex } from "./convexClient";
import { repo } from "./store";
import type { Id, OpsChatRow, OpsChatThread, OpsDatabase } from "./types";

/**
 * Named chats (9 Nov): the owner asked where the chat history was, and how
 * to rename or delete one. Each person's thread is now a list of chats, the
 * one on screen kept in the `ops_chat_thread` cookie like the column's own
 * open-or-shut.
 */

export const CHAT_COOKIE = "ops_chat_thread";
export const CHAT_COOKIE_LIFE = { path: "/", sameSite: "lax" as const, maxAge: 365 * 24 * 60 * 60 };

export async function addChatThread(input: Omit<OpsChatThread, "id">): Promise<OpsChatThread> {
  if (!usingConvex()) return repo.addChatThread(input);
  return (await convexMutation<OpsChatThread>("ops/data:addChatThread", input)) as OpsChatThread;
}

export async function renameChatThread(threadId: Id, name: string): Promise<void> {
  if (!usingConvex()) return repo.renameChatThread(threadId, name);
  await convexMutation("ops/data:renameChatThread", { threadId, name });
}

export async function deleteChatThread(memberId: Id, threadId: Id): Promise<void> {
  if (!usingConvex()) return repo.deleteChatThread(memberId, threadId);
  await convexMutation("ops/data:deleteChatThread", { memberId, threadId });
}

/**
 * A person's chats, newest activity first. Rows from before chats had names
 * show as one "Earlier chat" with the id "" - deletable, not renamable.
 * ponytail: "" is never moved into a named chat; only the laptop's test rows
 * are in it, so a migration would be for nobody.
 */
export function chatsOf(db: OpsDatabase, memberId: Id): OpsChatThread[] {
  const mine = db.chat.filter((r) => r.memberId === memberId);
  const last = (thread: Id) => mine.filter((r) => (r.thread ?? "") === thread).reduce((m, r) => Math.max(m, r.at), 0);
  const named = db.chatThreads.filter((t) => t.memberId === memberId).map((t) => ({ ...t, at: Math.max(t.at, last(t.id)) }));
  const legacy = mine.some((r) => !r.thread) ? [{ id: "", memberId, name: "Earlier chat", at: last("") }] : [];
  return [...named, ...legacy].sort((a, b) => b.at - a.at);
}

/**
 * The chat on screen: the one the cookie names if it is still this person's,
 * none after New chat ("new"), else the latest. `null` is a chat not yet
 * started - the first words make it.
 */
export function chatOpen(db: OpsDatabase, memberId: Id, cookie: string | undefined): Id | null {
  if (cookie === "new") return null;
  const chats = chatsOf(db, memberId);
  return chats.find((c) => c.id === cookie)?.id ?? chats[0]?.id ?? null;
}

/** The lines of one chat, oldest first; none for a chat not yet started. */
export function chatLines(db: OpsDatabase, memberId: Id, thread: Id | null, limit = 80): OpsChatRow[] {
  if (thread === null) return [];
  return db.chat
    .filter((r) => r.memberId === memberId && (r.thread ?? "") === thread)
    .sort((a, b) => a.at - b.at)
    .slice(-limit);
}

/** A chat's name from its first words: short enough for the list. */
export function chatName(said: string): string {
  const one = said.replace(/\s+/g, " ").trim();
  return one.length > 40 ? one.slice(0, 39).trimEnd() + "…" : one || "New chat";
}
