import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { PillTabs, pillPrimary, pillSecondary } from "@/app/ui/figma";
import SomethingChangedPanel from "@/app/ui/SomethingChangedPanel";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref } from "@/lib/sendModal";
import { resolveRoleTab } from "@/lib/roleTabs";
import { currentMember } from "@/lib/session";

import { clock, weekdayDayMonth } from "./tabs/shared/fmt";
import { buildRoleCtx, type RoleCtx } from "./tabs/ctx";
import Guarantee from "./tabs/Guarantee";
import History from "./tabs/History";
import Interviews from "./tabs/Interviews";
import Offer from "./tabs/Offer";
import Overview from "./tabs/Overview";
import Requirement from "./tabs/Requirement";
import { RoleSendModal } from "./tabs/RoleSendModals";
import Sets from "./tabs/Sets";

/** The one word beside the title: how far this role has got, from what the desk holds. */
function stageWord(c: RoleCtx): { label: string; dot: string; wrap: string } {
  const n = c.numbers;
  const hold = c.hold;
  if (c.position.stage === "closed") return { label: "Closed", dot: "bg-ink-faint", wrap: "bg-sunk text-ink-2" };
  if (hold) return { label: hold.state === "proposed" ? "Hold proposed" : "On hold", dot: "bg-danger", wrap: "bg-bg-danger text-danger" };
  const warn = { dot: "bg-warn", wrap: "bg-warn-soft text-warn" };
  const info = { dot: "bg-info", wrap: "bg-info-soft text-info" };
  const ok = { dot: "bg-brand", wrap: "bg-bg-brand text-brand" };
  if (n.placed.of !== null && n.placed.done >= n.placed.of) return { label: "Filled", ...ok };
  if (n.guarantee.n > 0 && n.interviews.n === 0 && n.withClient.n === 0) return { label: "Guarantee", ...ok };
  if (n.joining.n > 0 && n.interviews.n === 0) return { label: "Joining", ...info };
  if (n.interviews.n > 0) return { label: "Interviews", ...warn };
  if (n.withClient.n > 0) return { label: "With the client", ...info };
  if (n.ready.n > 0) return { label: "Ready to send", ...warn };
  return { label: "TA search", ...info };
}

/**
 * The role page: a loader plus one component per tab (tabs/). ?view= is one of
 * overview, sets, interviews, offer, guarantee, requirement, history; old keys are
 * aliased in src/lib/roleTabs.ts. Frames R0, R6, R7 (19 Nov).
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
  const { position, client, clientName, numbers: n, requirement, taName, now } = c;
  const tabKey = resolveRoleTab(view, tab);
  const path = `/positions/${position.id}`;
  const to = (key: string, panel?: string, on?: string) =>
    panel ? panelHref(path, { view: key }, panel, on) : `${path}?view=${key}`;

  const word = stageWord(c);
  const sub = [
    clientName,
    requirement?.fields.locations,
    `open ${c.daysOpen} ${c.daysOpen === 1 ? "day" : "days"}`,
    requirement?.fields.salary,
    client?.contacts?.[0]?.name ? `client HR ${client.contacts[0].name}` : null,
    `TA ${taName}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Something changed (G2): the interview it is about is `on`; each choice opens a short form on another tab.
  const changed = (() => {
    if (sp.panel !== "something-changed") return null;
    const iv = c.itsInterviews.find((x) => x.id === sp.on) ?? c.liveIv;
    const when = iv?.at ? `${weekdayDayMonth(iv.at)}, ${clock(iv.at)}` : null;
    const form = (key: string, panel: string) => panelHref(path, { view: key }, panel, iv?.id);
    return (
      <SomethingChangedPanel
        title={iv?.candidateName ?? position.title}
        sub={[iv ? `round ${iv.round}` : null, when, clientName, position.title].filter(Boolean).join(" · ")}
        closeHref={closeHref(path, sp)}
        rows={[
          { label: "Client cancelled", href: form("interviews", "find-a-time") },
          { label: "Client moved it", href: form("interviews", "find-a-time") },
          { label: "Candidate cannot come", href: form("interviews", "find-a-time") },
          { label: "Candidate dropped out", href: form("offer", "offer-declined") },
          { label: "No-show", href: form("offer", "did-not-join") },
          { label: "Waits for", note: "until a date", href: form("overview", "hold-close") },
          { label: "Other", href: panelHref(path, sp, "add-note") },
        ]}
      />
    );
  })();

  const cell = (label: string, value: number, line: string, href: string, warn = false) => (
    <Link key={label} href={href} className="group flex min-w-0 flex-1 items-center gap-2 py-1">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="t-micro text-ink-3">{label.toUpperCase()}</span>
        <span className={"text-[40px] font-light leading-[48px] " + (warn ? "text-warn" : "text-ink")}>{value}</span>
        <span className="t-small truncate text-ink-3">{line}</span>
      </span>
      <Icon name="chevron-right" size={14} className="shrink-0 text-ink-3 group-hover:text-ink" />
    </Link>
  );
  const placedPct = n.placed.of ? Math.min(100, Math.round((n.placed.done / n.placed.of) * 100)) : 0;

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Head (R0) */}
      <div className="flex flex-wrap items-center gap-3.5 p-1">
        <Link
          href="/positions"
          aria-label="Back to Positions"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-ink hover:bg-sunk"
        >
          <Icon name="chevron-left" size={18} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="t-display">{position.title}</h1>
            <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-4 " + word.wrap}>
              <span aria-hidden className={"size-1.5 rounded-full " + word.dot} />
              {word.label}
            </span>
          </div>
          <p className="t-small text-ink-3">{sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link scroll={false} href={to("interviews", "find-a-time")} className={pillPrimary}>
            <Icon name="plus" size={14} />
            Book an interview
          </Link>
          {tabKey === "overview" && (
            <>
              <Link scroll={false} href={to("overview", "hold-close-reopen")} className={pillSecondary}>
                Hold, close or reopen
              </Link>
              <Link scroll={false} href={to("overview", "not-practical")} className={pillSecondary}>
                Not practical
              </Link>
            </>
          )}
          {tabKey === "requirement" && (
            <Link scroll={false} href={to("requirement", "meeting-not-held")} className={pillSecondary}>
              Meeting not held
            </Link>
          )}
          <details className="group relative">
            <summary
              aria-label="More"
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-rule bg-surface text-ink hover:bg-sunk [&::-webkit-details-marker]:hidden"
            >
              <Icon name="more" size={18} />
            </summary>
            <div className="absolute right-0 z-10 mt-2 flex w-[260px] flex-col rounded-[18px] border border-rule bg-surface p-2 shadow-card">
              {client && (
                <Link href={`/clients/${client.id}`} className="t-body rounded-[12px] px-3 py-2.5 hover:bg-sunk">
                  Open {clientName}
                </Link>
              )}
              <Link href={`${path}?view=overview#opening-admin`} className="t-body rounded-[12px] px-3 py-2.5 hover:bg-sunk">
                People, contacts and closing
              </Link>
              {c.hold && (
                <Link href={`/holds/${c.hold.id}`} className="t-body rounded-[12px] px-3 py-2.5 hover:bg-sunk">
                  Open the hold
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>

      {msg && <div className="t-body rounded-[16px] border border-rule bg-sunk px-4 py-3">{msg}</div>}

      {/* Numbers (R0): where the people on this opening are */}
      <section className="flex flex-wrap items-center gap-x-2 gap-y-4 rounded-[28px] bg-surface px-7 py-[22px] shadow-card">
        {cell("TA search", n.taSearch.n, n.taSearch.line, to("sets"))}
        {cell("Ready to send", n.ready.n, n.ready.line, to("sets"))}
        {cell("With the client", n.withClient.n, n.withClient.line, to("sets"))}
        {cell("Interviews", n.interviews.n, n.interviews.line, to("interviews"), n.interviews.needsTime > 0)}
        {cell("Offer", n.offer.n, n.offer.line, to("offer"))}
        {cell("Joining", n.joining.n, n.joining.line, to("offer"))}
        {cell("Guarantee", n.guarantee.n, n.guarantee.line, to("guarantee"))}
        <div className="mx-3 hidden h-[70px] w-px bg-rule lg:block" />
        <div className="flex min-w-[200px] flex-col gap-2 py-1 lg:w-[200px]">
          <span className="t-micro text-ink-3">PLACED</span>
          <span className="t-h2 text-brand">{n.placed.of ? `${n.placed.done} of ${n.placed.of} placed` : `${n.placed.done} placed`}</span>
          {n.placed.of ? (
            <span className="h-1.5 w-full rounded-[3px] bg-rule">
              <span className="block h-1.5 rounded-[3px] bg-brand" style={{ width: placedPct + "%" }} />
            </span>
          ) : (
            <span className="t-small text-ink-3">no headcount recorded</span>
          )}
        </div>
      </section>

      <PillTabs
        active={tabKey}
        items={[
          { key: "overview", label: "Overview", href: to("overview") },
          { key: "sets", label: "Sets", count: c.itsSets.length || undefined, href: to("sets") },
          { key: "interviews", label: "Interviews", count: n.interviews.n || undefined, href: to("interviews") },
          { key: "offer", label: "Offer and joining", count: c.itsPlacements.length || undefined, href: to("offer") },
          { key: "guarantee", label: "Guarantee", count: n.guarantee.n || undefined, href: to("guarantee") },
          { key: "requirement", label: "Requirement and adverts", href: to("requirement") },
          { key: "history", label: "History", href: to("history") },
        ]}
      />

      {tabKey === "overview" && <Overview c={c} sp={sp} />}
      {tabKey === "interviews" && <Interviews c={c} sp={sp} />}
      {tabKey === "sets" && <Sets c={c} sp={sp} />}
      {tabKey === "offer" && <Offer c={c} sp={sp} />}
      {tabKey === "guarantee" && <Guarantee c={c} sp={sp} />}
      {tabKey === "requirement" && <Requirement c={c} sp={sp} />}
      {tabKey === "history" && <History c={c} sp={sp} />}
      {changed}
      {sp.send && <RoleSendModal send={sp.send} on={sp.on} c={c} closeHref={closeSendHref(path, sp)} />}
    </div>
  );
}
