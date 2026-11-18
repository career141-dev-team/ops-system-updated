import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { PageBox, ViewPills, pillPrimary, pillSecondary } from "@/app/ui/figma";
import {
  agreementForLead,
  clientIn,
  desk,
  liveHoldFor,
  member as memberIn,
  outboxWaiting,
  positionsNewestFirst,
  runClocks,
} from "@/data/desk";
import { loopSummary } from "@/lib/journey";
import { currentMember } from "@/lib/session";

// Three groups (owner, 17 Nov evening; no Kanban board): an opening stays under Requirement & JD until the
// requirement is approved (and its agreement signed); then Search & interviews, where it stays while sets and
// interviews loop; and only once somebody is placed, Offer & joining.
type BoardStage = "jd" | "search" | "joining";

interface BoardCard {
  id: string;
  href: string;
  clientName: string;
  title: string;
  stage: BoardStage;
  /** Which part of the loop holds it now: searching, with the client, or an interview. */
  part: string;
  /** The loop in numbers: "Search active · 2 sets · 1 to interview". */
  loopLine: string | null;
  dotClass: string;
  statusText: string;
  statusDanger?: boolean;
  needsTa: boolean;
  needsJd: boolean;
  onHold: boolean;
  closed: boolean;
  searchWords: string;
}

const GROUPS: { key: BoardStage; title: string; about: string }[] = [
  { key: "jd", title: "Requirement & JD", about: "Waiting for the client to approve the requirement and the JD, and the agreement to be signed" },
  { key: "search", title: "Search & interviews", about: "Searching, CV sets with the client and interviews, until somebody is placed" },
  { key: "joining", title: "Offer & joining", about: "Somebody is placed: the offer, and the day they join" },
];

/**
 * OP · Openings, in groups (owner, 17 Nov evening): every opening listed under Requirement & JD,
 * Search & interviews (with a summary of the loop on each) or Offer & joining.
 */
export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; filter?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q = "", filter = "all" } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const queued = new Set(
    outboxWaiting(db)
      .filter((one) => one.subjectType === "position")
      .map((one) => one.subjectId),
  );

  const allPositions = positionsNewestFirst(db);

  const cards: BoardCard[] = allPositions.map((position) => {
    const client = position.clientId ? clientIn(db, position.clientId) : null;
    const clientName = client?.name ?? (position.clientTaId || "Client");
    const hold = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;
    const sets = db.clientSets.filter((row) => row.openingTaId === position.openingTaId);
    const sentSets = sets.filter((row) => row.state === "sent");
    const waitingSet = sentSets.find((s) => s.candidates.some((c) => !c.decision)) ?? null;
    const readySet = sets.find((s) => s.state !== "sent" && s.state !== "withdrawn") ?? null;
    const liveIv =
      db.interviews.find(
        (iv) =>
          iv.openingTaId === position.openingTaId &&
          ["slots", "agreed", "booked", "reconfirmed"].includes(iv.state),
      ) ?? null;
    const placement =
      db.placements.find((pl) => pl.openingTaId === position.openingTaId && pl.state !== "cancelled") ?? null;

    const closed = position.stage === "closed" || Boolean(position.closedAt);
    const onHold = Boolean(hold) || position.stage === "on_hold";
    const needsTa = !closed && (!position.primaryTaId || !position.openingTaId || queued.has(position.id));
    const needsJd = !closed && !position.jdApprovedAt;
    // An agreement that is out but not signed holds the opening under Requirement & JD (one that was never started does not).
    const leadId = position.requirementId ? (db.requirements.find((r) => r.id === position.requirementId)?.leadId ?? null) : null;
    const esa = leadId ? agreementForLead(db, leadId) : null;
    const agreementPending = !!esa && esa.state !== "signed" && esa.state !== "countersigned";

    let stage: BoardStage = "search";
    let part = "Searching";
    let dotClass = "bg-brand";
    let statusText = "Searching";
    let statusDanger = false;

    const daysOpen = Math.max(1, Math.floor((now - (position.handedOverAt ?? position.createdAt)) / 86_400_000));

    if (placement) {
      stage = "joining";
      dotClass = "bg-ok";
      const joinDays = placement.joinDate ? Math.ceil((placement.joinDate - now) / 86_400_000) : 0;
      statusText =
        placement.joinedAt || joinDays <= 0
          ? "Joining today"
          : joinDays === 1
            ? "Joining tomorrow"
            : `Joining in ${joinDays} days`;
    } else if (!closed && (!position.jdApprovedAt || agreementPending)) {
      // Until the client approves the requirement (and has signed), it stays here, whatever else has started.
      stage = "jd";
      dotClass = "bg-warning";
      statusText = !position.jdApprovedAt ? "JD to approve" : "Waiting for the signed agreement";
    } else if (liveIv) {
      stage = "search";
      part = "Interview";
      dotClass = "bg-info";
      if (liveIv.at) {
        const dt = new Date(liveIv.at + 5.5 * 3_600_000);
        const weekday = dt.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
        const hm = dt.toISOString().slice(11, 16);
        statusText = `${weekday} ${hm}`;
      } else {
        statusText = `Round ${liveIv.round} · agreeing time`;
      }
    } else if (waitingSet || readySet) {
      stage = "search";
      part = "With the client";
      const activeSet = waitingSet ?? readySet!;
      const silentDays = activeSet.receivedAt
        ? Math.floor((now - activeSet.receivedAt) / 86_400_000)
        : 0;
      if (silentDays >= 2) {
        dotClass = "bg-danger";
        statusText = "Feedback late";
        statusDanger = true;
      } else {
        dotClass = "bg-warning";
        statusText =
          activeSet.state === "sent"
            ? `${activeSet.name} · Day ${Math.max(1, silentDays + 1)} of 7`
            : `${activeSet.name} ready to send`;
      }
    } else {
      stage = "search";
      if (!position.primaryTaId) {
        dotClass = "bg-warning";
        statusText = "Needs a TA";
      } else if (onHold) {
        dotClass = "bg-danger";
        statusText = hold?.state === "proposed" ? "Hold proposed" : "On hold";
        statusDanger = hold?.state === "proposed";
      } else {
        dotClass = "bg-brand";
        statusText = `Day ${Math.min(daysOpen, 21)} of 21`;
      }
    }

    const ownerName = memberIn(db, position.ownerId)?.name ?? "";
    const loopLine =
      stage === "search"
        ? loopSummary({
            taStatus: closed ? "closed" : onHold ? "on_hold" : "active",
            sets,
            interviews: db.interviews.filter((iv) => iv.openingTaId === position.openingTaId),
          }).line
        : null;

    return {
      id: position.id,
      href: stage === "jd" ? `/positions/${position.id}?view=jd` : `/positions/${position.id}`,
      clientName,
      title: position.title,
      stage,
      part: stage === "search" ? part : "",
      loopLine,
      dotClass,
      statusText,
      statusDanger,
      needsTa,
      needsJd,
      onHold,
      closed,
      searchWords: [clientName, position.title, position.openingTaId ?? "", ownerName, statusText]
        .join(" ")
        .toLowerCase(),
    };
  });

  const openCards = cards.filter((c) => !c.closed);
  const needsTaCount = openCards.filter((c) => c.needsTa).length;
  const needsJdCount = openCards.filter((c) => c.needsJd).length;
  const onHoldCount = openCards.filter((c) => c.onHold).length;
  const closedCount = cards.filter((c) => c.closed).length;

  const query = q.trim().toLowerCase();
  const filtered = cards.filter((card) => {
    if (query && !card.searchWords.includes(query)) return false;
    if (filter === "needs_ta") return card.needsTa;
    if (filter === "jd") return card.needsJd;
    if (filter === "hold") return card.onHold;
    if (filter === "closed") return card.closed;
    return !card.closed;
  });

  return (
    <PageBox width="full" className="gap-[26px]">
      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Top filter & search bar (1:771) */}
      <div className="flex flex-wrap items-center gap-3">
        <ViewPills
          items={[
            { key: "all", label: "All", count: openCards.length, href: `/positions?filter=all${q ? `&q=${encodeURIComponent(q)}` : ""}` },
            { key: "needs_ta", label: "Needs a TA", count: needsTaCount, href: `/positions?filter=needs_ta${q ? `&q=${encodeURIComponent(q)}` : ""}` },
            { key: "jd", label: "JD to approve", count: needsJdCount, href: `/positions?filter=jd${q ? `&q=${encodeURIComponent(q)}` : ""}` },
            { key: "hold", label: "On hold", count: onHoldCount, href: `/positions?filter=hold${q ? `&q=${encodeURIComponent(q)}` : ""}` },
            { key: "closed", label: "Closed", count: closedCount || undefined, href: `/positions?filter=closed${q ? `&q=${encodeURIComponent(q)}` : ""}` },
          ]}
          active={filter}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <form action="/positions" method="get" className="flex h-[44px] w-[320px] items-center gap-2.5 rounded-full bg-sunk px-4">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <Icon name="find" size={18} className="shrink-0 text-ink-faint" />
            <input
              type="search"
              name="q" autoComplete="off"
              defaultValue={q}
              placeholder="Find a role or client"
              className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </form>

          <Link href="/talent-pulse" className={pillSecondary}>
            Talent Pulse
          </Link>

          <Link href="/clients?filter=leads" className={pillPrimary}>
            <Icon name="plus" size={16} />
            New opening
          </Link>
        </div>
      </div>

      {/* Closed filter view */}
      {filter === "closed" ? (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.84px] text-ink-faint">
            CLOSED OPENINGS · {filtered.length}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No closed openings match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="flex flex-col gap-1 rounded-[16px] bg-sunk p-4 transition-colors hover:bg-shell"
                >
                  <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
                    {card.clientName}
                  </span>
                  <span className="text-[16px] font-medium leading-[26px] text-ink">
                    {card.title}
                  </span>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <span className="size-[7px] shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
                    <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
                      Closed
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* The openings in three groups, one under the other (owner, 17 Nov evening): easier to read than a board. */
        <div className="flex flex-col gap-7">
          {GROUPS.map((group) => {
            const rows = filtered.filter((c) => c.stage === group.key);
            return (
              <section key={group.key} className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-1">
                  <h2 className="text-[18px] font-medium leading-[26px] text-ink">{group.title}</h2>
                  <span className="text-[13px] font-medium text-ink-faint">{rows.length}</span>
                  <span className="text-[13px] text-ink-soft">{group.about}</span>
                </div>

                {rows.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-rule px-4 py-5 text-[13px] text-ink-faint">
                    Nothing in {group.title.toLowerCase()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {rows.map((card) => (
                      <Link
                        key={card.id}
                        href={card.href}
                        className="flex flex-col gap-1 rounded-[20px] bg-surface p-4 shadow-card transition-shadow hover:shadow-float"
                      >
                        <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">{card.clientName}</span>
                        <span className="text-[16px] font-medium leading-[26px] text-ink">{card.title}</span>
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <span className={`size-[7px] shrink-0 rounded-full ${card.dotClass}`} aria-hidden="true" />
                          <span
                            className={`text-[12px] font-medium leading-4 tracking-[0.4px] ${
                              card.statusDanger ? "text-danger" : "text-ink-soft"
                            }`}
                          >
                            {card.statusText}
                          </span>
                        </div>
                        {card.loopLine && (
                          <span className="text-[12px] leading-4 text-ink-soft">
                            {card.part} · {card.loopLine}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </PageBox>
  );
}
