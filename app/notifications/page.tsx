import Link from "next/link";
import { redirect } from "next/navigation";
import { desk, runClocks } from "@/data/desk";
import { clientNews } from "@/lib/clientNews";
import { hrefForSubject } from "@/lib/notificationLink";
import { day } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The dot's colour says what kind of thing it is (frame G4). */
const DOT = { danger: "bg-danger", warn: "bg-warn", info: "bg-info", brand: "bg-brand", quiet: "bg-ink-3" } as const;

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

  // Only what is about a client, as a sentence (frame G4); the audit's own codes stay on the audit.
  const items = clientNews(db).map((n) => ({ id: n.id, title: n.text, href: href(n.subjectType, n.subjectId), at: n.at, dot: DOT[n.tone] }));

  const when = (at: number) =>
    (at >= todayMs ? "Today " : day(at) + " ") + new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);

  return (
    <div className="mx-auto w-full max-w-[480px] pb-10 pt-2 md:pt-6">
      <div className="flex flex-col gap-[18px] rounded-[28px] bg-surface p-7 shadow-card">
        <div className="flex flex-col gap-0.5">
          <h1 className="t-h2">Notifications</h1>
          {/* No "Mark all read": nothing stores what was read yet (see Bell.tsx). */}
          <p className="t-small text-ink-3">What changed on my clients today</p>
        </div>
        <div className="h-px bg-rule" />
        {items.length === 0 ? (
          <p className="t-body text-ink-3">Nothing has changed on your clients yet.</p>
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
