import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar, BackBar, PageBox, StatusChip, ViewPills } from "@/app/ui/figma";
import { resolveRoleTab } from "@/lib/roleTabs";
import { currentMember } from "@/lib/session";

import { buildRoleCtx } from "./tabs/ctx";
import Guarantee from "./tabs/Guarantee";
import History from "./tabs/History";
import Interviews from "./tabs/Interviews";
import Offer from "./tabs/Offer";
import Overview from "./tabs/Overview";
import Requirement from "./tabs/Requirement";
import Sets from "./tabs/Sets";

/**
 * The role page: a loader plus one component per tab (tabs/). ?view= is one of
 * overview, interviews, sets, offer, guarantee, requirement, history; old keys are
 * aliased in src/lib/roleTabs.ts.
 */
export default async function PositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const sp = await searchParams;
  const { msg, view, tab, stage = "all" } = sp;

  const c = await buildRoleCtx(id, stage, me);
  if (!c) notFound();
  const { position, client, clientName, hold, itsSets, itsInterviews, primaryTaPerson, taName, opsOwner, opsOwnerName } = c;
  const tabKey = resolveRoleTab(view, tab);


  return (
    <PageBox width="1160" className="gap-6">
      {/* Top BackBar (1:869) */}
      <BackBar
        href="/positions"
        label="Openings"
        right={
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <Avatar name={primaryTaPerson?.fullName ?? taName} size="28" tone="info" />
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                {taName} · TA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name={opsOwner?.name ?? opsOwnerName} size="28" tone="brand" />
              <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                {opsOwnerName} · Ops
              </span>
            </div>
          </div>
        }
      />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Header + 7 Sub-View Pills (1:882) */}
      <div className="flex flex-col gap-3.5 border-b border-rule pb-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            {client ? (
              <Link href={`/clients/${client.id}`} className="text-[14px] leading-[22px] text-ink-faint hover:text-brand">
                {clientName}
              </Link>
            ) : (
              <span className="text-[14px] leading-[22px] text-ink-faint">{clientName}</span>
            )}
            <h1 className="text-[40px] font-light leading-[50px] text-ink">{position.title}</h1>
          </div>

          {hold && (
            <Link href={`/holds/${hold.id}`}>
              <StatusChip
                label={hold.state === "proposed" ? "Hold proposed" : "On hold"}
                tone="danger"
              />
            </Link>
          )}
        </div>

        <ViewPills
          items={[
            { key: "overview", label: "Overview", href: `/positions/${position.id}?view=overview` },
            { key: "interviews", label: "Interviews", count: itsInterviews.length || undefined, href: `/positions/${position.id}?view=interviews` },
            { key: "sets", label: "CV sets", count: itsSets.length, href: `/positions/${position.id}?view=sets` },
            { key: "offer", label: "Offer", href: `/positions/${position.id}?view=offer` },
            { key: "guarantee", label: "Guarantee", href: `/positions/${position.id}?view=guarantee` },
            { key: "requirement", label: "Requirement", href: `/positions/${position.id}?view=requirement` },
            { key: "history", label: "History", href: `/positions/${position.id}?view=history` },
          ]}
          active={tabKey}
        />
      </div>

      {tabKey === "overview" && <Overview c={c} sp={sp} />}
      {tabKey === "interviews" && <Interviews c={c} sp={sp} />}
      {tabKey === "sets" && <Sets c={c} sp={sp} />}
      {tabKey === "offer" && <Offer c={c} sp={sp} />}
      {tabKey === "guarantee" && <Guarantee c={c} sp={sp} />}
      {tabKey === "requirement" && <Requirement c={c} sp={sp} />}
      {tabKey === "history" && <History c={c} sp={sp} />}
    </PageBox>
  );
}
