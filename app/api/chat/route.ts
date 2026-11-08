import { addChatRow, chatFor, desk } from "@/data/desk";
import { feedMark, feedSince } from "@/lib/feed";
import { currentMember } from "@/lib/session";

/**
 * The chat's poll (8 Nov, docs/31 part 2), asked every half minute by the
 * column, the way the bell is.
 *
 * It does two things. It keeps what arrived by itself - new email, a clock
 * that ran out, a task made for you, a TA event - as feed rows in this
 * person's thread, once each (the row's mark is the source row, so a second
 * poll finds it already kept). And it answers with every row after the
 * `after` the column last saw, so the column appends rather than reloads.
 *
 * Only for the person signed in: a request with no session gets nothing.
 * `no-store`, because a cached "nothing new" is the lie this exists to stop.
 */
export async function GET(request: Request): Promise<Response> {
  const member = await currentMember();
  if (!member) return Response.json({ ok: false }, { status: 401 });
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0") || 0;
  const now = Date.now();

  let db = await desk();
  const mine = chatFor(db, member.id, 1000);
  const kept = new Set(mine.map((r) => r.actionName).filter((a): a is string => !!a && a.startsWith("feed:")));
  // The feed's own cursor is the newest feed row kept; a fresh thread starts
  // from the last day, not from the beginning of time.
  const newestFeed = mine.filter((r) => r.who === "feed").reduce((m, r) => Math.max(m, r.at), 0);
  const cursor = newestFeed || now - 24 * 60 * 60 * 1000;

  let wrote = 0;
  for (const line of feedSince(db, member.id, cursor, now)) {
    if (kept.has(feedMark(line.key))) continue;
    await addChatRow({
      memberId: member.id,
      who: "feed",
      text: line.text + (line.open ? "\n" + line.open : ""),
      buttons: line.buttons,
      state: line.buttons.length ? "proposed" : "done",
      actionName: feedMark(line.key),
      runId: null,
      // Kept at the moment it was seen, so the cursor only ever moves forward.
      at: Math.max(line.at, newestFeed + 1),
    });
    wrote += 1;
  }
  if (wrote) db = await desk();

  const rows = chatFor(db, member.id, 1000).filter((r) => r.at > after);
  return Response.json({ ok: true, rows, now }, { headers: { "cache-control": "no-store" } });
}
