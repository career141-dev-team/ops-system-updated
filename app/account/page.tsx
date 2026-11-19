import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import Icon from "@/app/Icon";
import { activeMembers, desk } from "@/data/desk";
import { PageTitle, pillSecondary } from "@/app/ui/figma";
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

  const cardShell = "flex flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card";
  const helpRow = "flex items-center justify-between gap-4 rounded-[16px] border border-rule bg-surface px-4 py-3 transition-colors hover:bg-sunk";
  const caption = "text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint";

  return (
    <div className="flex flex-col gap-[22px]">
        <PageTitle
          title={me.name}
          sub={`${me.role} · ${myClients.length} client${myClients.length === 1 ? "" : "s"}`}
          right={<span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[22px] text-brand">{me.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={cardShell}>
            <div className={caption}>
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
            <div className={caption}>
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

        <div className={cardShell}>
          <div className={caption}>
            HELP
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <Link
                href="/reports"
                className={helpRow}
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="file" size={16} />
                  </span>
                  <span className="text-[16px] leading-[26px] text-ink">How the Ops flow works</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>

              <Link
                href="/ai"
                className={helpRow}
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="sparkle" size={16} />
                  </span>
                  <span className="text-[16px] leading-[26px] text-ink">What AURA can and can&rsquo;t do</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>

              <Link
                href="/health"
                className={helpRow}
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                    <Icon name="flag" size={16} />
                  </span>
                  <span className="text-[16px] leading-[26px] text-ink">Report a problem</span>
                </div>
                <Icon name="chevron-right" size={16} className="text-ink-faint" />
              </Link>
            </div>
          </div>
        </div>

        <div>
          <Link
            href="/settings"
            className={helpRow}
          >
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-sunk text-ink-soft">
                <Icon name="lock" size={16} />
              </span>
              <span className="text-[16px] leading-[26px] text-ink">Settings</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[14px] text-ink-faint">
                {can(me, "settings.manage") ? "Ops lead access" : "Ops lead only"}
              </span>
              <Icon name="chevron-right" size={16} className="text-ink-faint" />
            </div>
          </Link>
        </div>

        <div>
          {/* A form, not a link: the link only changed the page and left the session behind (16 Nov). */}
          <form action={signOutAction}>
            <button className={pillSecondary}>Sign out</button>
          </form>
        </div>
    </div>
  );
}
