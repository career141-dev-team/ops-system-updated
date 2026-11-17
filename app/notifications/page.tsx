import Link from "next/link";
import { redirect } from "next/navigation";
import Icon, { type IconName } from "@/app/Icon";
import { desk, member as memberIn, runClocks } from "@/data/desk";
import { PageBox, pillGhost } from "@/app/ui/figma";
import { day } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

function hrefForSubject(subjectType: string, subjectId: string): string {
  switch (subjectType) {
    case "client":
      return `/clients/${subjectId}`;
    case "lead":
      return `/leads/${subjectId}`;
    case "position":
      return `/positions/${subjectId}`;
    case "clientSet":
      return `/sets/${subjectId}`;
    case "interview":
      return `/interviews/${subjectId}`;
    case "placement":
      return `/placements/${subjectId}`;
    case "invoice":
      return `/invoices/${subjectId}`;
    case "guarantee":
      return `/guarantees/${subjectId}`;
    case "report":
      return `/reports/${subjectId}`;
    case "message":
      return `/messages/${subjectId}`;
    default:
      return "/";
  }
}

/** "client.created" as "Client created": the action's own code is for the audit, not for a person. */
const sentence = (code: string) => {
  const words = code.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function iconForKind(kind: string): IconName {
  if (kind.includes("reply") || kind.includes("message")) return "mail";
  if (kind.includes("interview")) return "calendar";
  if (kind.includes("invoice") || kind.includes("payment") || kind.includes("refund")) return "wallet";
  if (kind.includes("late") || kind.includes("overdue")) return "alert";
  return "check";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ read?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const sp = await searchParams;
  const markedAll = sp.read === "all";

  await runClocks();
  const db = await desk();
  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const items = [
    ...db.timers
      .filter((t) => t.state === "running" && t.dueAt <= now)
      .map((t) => ({
        id: `timer:${t.id}`,
        title: sentence(t.kind),
        subtitle: "A clock came due",
        href: hrefForSubject(t.subjectType, t.subjectId),
        at: t.dueAt,
        urgent: true,
        unread: !markedAll,
        icon: "alert" as IconName,
      })),
    ...db.audit
      .slice()
      .sort((a, b) => b.at - a.at)
      .slice(0, 25)
      .map((e) => {
        const actor = e.actorId ? memberIn(db, e.actorId) : null;
        return {
          id: `audit:${e.id}`,
          title: e.reason || sentence(e.action),
          subtitle: actor ? actor.name : "The system",
          href: hrefForSubject(e.subjectType, e.subjectId),
          at: e.at,
          urgent: false,
          unread: !markedAll && e.at >= todayMs,
          icon: iconForKind(e.action),
        };
      }),
  ].sort((a, b) => b.at - a.at);

  const todayItems = items.filter((i) => i.at >= todayMs);
  const earlierItems = items.filter((i) => i.at < todayMs);

  const formatClockTime = (at: number) => {
    if (at >= todayMs) {
      return new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);
    }
    return day(at);
  };

  const row = (item: (typeof items)[number]) => (
    <Link
      key={item.id}
      href={item.href}
      className={`flex items-center justify-between gap-4 rounded-[16px] px-3 py-3 transition-colors hover:bg-sunk ${item.unread ? "bg-brand-tint" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${item.unread ? "bg-surface text-ink" : "bg-sunk text-ink-soft"}`}>
          <Icon name={item.icon} size={16} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[16px] leading-[26px] text-ink">{item.title}</div>
          <div className="truncate text-[14px] leading-[21px] text-ink-faint">{item.subtitle}</div>
        </div>
      </div>
      <span className={`shrink-0 text-[14px] leading-[21px] ${item.urgent ? "text-danger" : "text-ink-faint"}`}>{formatClockTime(item.at)}</span>
    </Link>
  );
  const caption = "text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint";

  return (
    <PageBox width="880">
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[40px] font-light leading-[50px] text-ink">Notifications</h1>
            <Link href="/notifications?read=all" className={pillGhost}>
              Mark all read
            </Link>
          </div>
          <p className="mt-1 text-[14px] leading-[21px] text-ink-soft">Each one opens the thing it is about. Back brings you here.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className={caption}>Today</div>
          {todayItems.length === 0 ? (
            <div className="px-3 py-4 text-[14px] text-ink-soft">Nothing new today.</div>
          ) : (
            <div className="flex flex-col gap-1">{todayItems.map(row)}</div>
          )}
        </div>

        {earlierItems.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className={caption}>Earlier</div>
            <div className="flex flex-col gap-1">{earlierItems.slice(0, 15).map(row)}</div>
          </div>
        )}
      </div>
    </PageBox>
  );
}
