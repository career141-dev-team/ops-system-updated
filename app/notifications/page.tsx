import Link from "next/link";
import { redirect } from "next/navigation";
import { desk, member as memberIn, runClocks } from "@/data/desk";
import { hrefForSubject } from "@/lib/notificationLink";
import { day } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/** "client.created" as "Client created": the action's own code is for the audit, not for a person. */
const sentence = (code: string) => {
  const words = code.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The dot's colour says what kind of thing it is (frame G4): red late, amber a chase or a move, blue a reply. */
function dotFor(kind: string): string {
  if (kind.includes("late") || kind.includes("overdue")) return "bg-danger";
  if (kind.includes("reply") || kind.includes("message") || kind.includes("interview")) return "bg-info";
  if (kind.includes("chase") || kind.includes("invoice") || kind.includes("refund")) return "bg-warn";
  if (kind.includes("signed") || kind.includes("placed")) return "bg-brand";
  return "bg-ink-3";
}

export default async function NotificationsPage() {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  await runClocks();
  const db = await desk();
  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const href = (type: string, id: string) => hrefForSubject(db, type, id);

  const items = [
    ...db.timers
      .filter((t) => t.state === "running" && t.dueAt <= now)
      .map((t) => ({ id: `timer:${t.id}`, title: sentence(t.kind) + ": a clock came due", href: href(t.subjectType, t.subjectId), at: t.dueAt, dot: "bg-danger" })),
    ...db.audit
      .slice()
      .sort((a, b) => b.at - a.at)
      .slice(0, 25)
      .map((e) => {
        const actor = e.actorId ? memberIn(db, e.actorId) : null;
        return {
          id: `audit:${e.id}`,
          title: (e.reason || sentence(e.action)) + (actor ? " (" + actor.name + ")" : ""),
          href: href(e.subjectType, e.subjectId),
          at: e.at,
          dot: dotFor(e.action),
        };
      }),
  ].sort((a, b) => b.at - a.at).slice(0, 30);

  const when = (at: number) =>
    (at >= todayMs ? "Today " : day(at) + " ") + new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);

  return (
    <div className="mx-auto w-full max-w-[480px] pb-10 pt-2 md:pt-6">
      <div className="flex flex-col gap-[18px] rounded-[28px] bg-surface p-7 shadow-card">
        <div className="flex flex-col gap-0.5">
          <h1 className="t-h2">Notifications</h1>
          {/* No "Mark all read": nothing stores what was read yet (see Bell.tsx). */}
          <p className="t-small text-ink-3">What changed on the desk, newest first</p>
        </div>
        <div className="h-px bg-rule" />
        {items.length === 0 ? (
          <p className="t-body text-ink-3">Nothing has changed yet.</p>
        ) : (
          items.map((item) => (
            <Link key={item.id} href={item.href} className="-mx-2 flex items-start gap-3 rounded-[12px] px-2 py-1 hover:bg-sunk">
              <span className="flex pt-[14px]"><span aria-hidden className={"size-2 rounded-[4px] " + item.dot} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="t-body text-ink">{item.title}</span>
                <span className="t-small text-ink-3">{when(item.at)}</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
