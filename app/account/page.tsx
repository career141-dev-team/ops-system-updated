import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { activeMembers, desk } from "@/data/desk";
import { Avatar, PageBox, pillSecondary } from "@/app/ui/figma";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const db = await desk();
  const myClients = db.clients.filter((c) => c.ownerId === me.id);
  const members = activeMembers(db).filter((m) => m.id !== me.id);
  const coverMember = members[0] ?? null;

  const cardShell = "rounded-[24px] border border-edge bg-surface p-5";

  return (
    <PageBox width="880">
      <div className="flex flex-col gap-7">
        <div className="flex items-center gap-5">
          <Avatar name={me.name} size="48" />
          <div>
            <h1 className="font-serif text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
              {me.name}
            </h1>
            <p className="mt-1 text-[14px] text-ink-soft">
              {me.role} · {myClients.length} client{myClients.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={cardShell}>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              WHILE I&rsquo;M AWAY
            </div>
            <div className="mt-3 flex flex-col gap-2.5 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">My work goes to</span>
                <span className="font-medium text-ink">
                  {coverMember?.name ?? "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">From – to</span>
                <span className="font-medium text-ink">Not set</span>
              </div>
            </div>
          </div>

          <div className={cardShell}>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              TELL ME ABOUT
            </div>
            <div className="mt-3 flex flex-col gap-2.5 text-[14px]">
              {[
                { label: "Client replies", on: true },
                { label: "Anything late", on: true },
                { label: "Daily summary at 8:30", on: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="text-ink">{item.label}</span>
                  <span
                    className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition ${
                      item.on ? "justify-end bg-brand" : "justify-start bg-edge-strong"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-surface shadow-sm" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            HELP
          </div>
          <div className="rounded-[24px] border border-edge bg-surface p-2">
            <div className="divide-y divide-edge/60">
              <Link
                href="/reports"
                className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="file" size={16} />
                  </span>
                  <span className="text-[14.5px] text-ink">How the Ops flow works</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>

              <Link
                href="/ai"
                className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="sparkle" size={16} />
                  </span>
                  <span className="text-[14.5px] text-ink">What AURA can and can&rsquo;t do</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>

              <Link
                href="/health"
                className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="flag" size={16} />
                  </span>
                  <span className="text-[14.5px] text-ink">Report a problem</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-edge bg-surface p-2">
          <Link
            href="/settings"
            className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink-soft">
                <Icon name="lock" size={16} />
              </span>
              <span className="text-[14.5px] text-ink">Settings</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-ink-faint">
                {can(me, "settings.manage") ? "Ops lead access" : "Ops lead only"}
              </span>
              <Icon name="chevron-right" size={16} className="text-ink-faint" />
            </div>
          </Link>
        </div>

        <div>
          <Link href="/sign-in" className={pillSecondary}>
            Sign out
          </Link>
        </div>
      </div>
    </PageBox>
  );
}
