import { desk } from "@/data/desk";
import { bellOf } from "@/lib/bell";
import { currentMember } from "@/lib/session";

/**
 * The bell's number, asked for every half minute by the sidebar (7 Nov).
 *
 * It answers only for the person signed in - the count is theirs, read from
 * their own cookie, and a request with no session gets nothing rather than
 * somebody else's day. `no-store` because a cached "nothing waiting" is
 * exactly the lie the bell exists to stop telling.
 */
export async function GET(): Promise<Response> {
  const member = await currentMember();
  if (!member) return Response.json({ ok: false }, { status: 401 });
  const db = await desk();
  return Response.json(
    { ok: true, ...bellOf(db, member.id, Date.now()) },
    { headers: { "cache-control": "no-store" } },
  );
}
