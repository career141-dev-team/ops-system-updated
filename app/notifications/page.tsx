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
        title: t.kind.replace(/\./g, " "),
        subtitle: `Clock due · ${t.subjectType}`,
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
          title: e.reason || e.action.replace(/\./g, " "),
          subtitle: `${e.action}${actor ? ` · ${actor.name}` : ""}`,
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

  const cardShell = "rounded-[24px] border border-edge bg-surface p-2";

  return (
    <PageBox width="880">
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-serif text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
              Notifications
            </h1>
            <Link href="/notifications?read=all" className={pillGhost}>
              Mark all read
            </Link>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Each one opens the thing it is about. Back brings you here.
          </p>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            TODAY
          </div>
          <div className={cardShell}>
            {todayItems.length === 0 ? (
              <div className="px-4 py-6 text-[13.5px] text-ink-soft">Nothing new today.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todayItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center justify-between gap-4 rounded-[16px] px-4 py-4 transition hover:bg-sunk/60 ${
                      item.unread ? "bg-bg-brand/60" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          item.unread ? "bg-surface text-brand" : "bg-sunk text-ink-soft"
                        }`}
                      >
                        <Icon name={item.icon} size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-ink">
                          {item.title}
                        </div>
                        <div className="truncate text-[12px] text-ink-soft">{item.subtitle}</div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[12.5px] font-medium ${
                        item.urgent ? "text-danger" : "text-ink-faint"
                      }`}
                    >
                      {formatClockTime(item.at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {earlierItems.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              EARLIER
            </div>
            <div className={cardShell}>
              <div className="flex flex-col gap-2.5">
                {earlierItems.slice(0, 15).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-4 transition hover:bg-sunk/60"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                        <Icon name={item.icon} size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-ink">
                          {item.title}
                        </div>
                        <div className="truncate text-[12px] text-ink-soft">{item.subtitle}</div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[12.5px] ${
                        item.urgent ? "font-medium text-danger" : "text-ink-faint"
                      }`}
                    >
                      {formatClockTime(item.at)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageBox>
  );
}
