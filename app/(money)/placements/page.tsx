import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { PageBox, RecordCard, ViewPills, type Tone } from "@/app/ui/figma";
import {
  clientIn,
  desk,
  guaranteesNewestFirst,
  invoiceIn,
  member as memberIn,
  placementsNewestFirst,
  positionIn,
  runClocks,
} from "@/data/desk";
import { workingDaysBetween } from "@/lib/calendar";
import { balanceOf, placementInWords } from "@/lib/money";
import { currentMember } from "@/lib/session";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function colomboDate(at: number): Date {
  return new Date(at + 5.5 * 3_600_000);
}

function shortDate(at: number): string {
  const d = colomboDate(at);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function isSameDay(a: number, b: number): boolean {
  const da = colomboDate(a);
  const db = colomboDate(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

/**
 * Frame `1:2743` — PL · Placements — offers, joining, guarantees.
 */
export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string; view?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, view = "all" } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const allPlacements = placementsNewestFirst(db);
  const allGuarantees = guaranteesNewestFirst(db);
  const holidays = db.holidays.map((h) => h.date);

  const query = (q ?? "").trim().toLowerCase();
  const matchesQuery = (words: (string | null | undefined)[]) => {
    if (!query) return true;
    return words.some((w) => (w ?? "").toLowerCase().includes(query));
  };

  // Map placements with their context
  const enrichedPlacements = allPlacements
    .map((placement) => {
      const owner = memberIn(db, placement.ownerId)?.name ?? "Unassigned";
      const position = placement.positionId ? positionIn(db, placement.positionId) : null;
      const client = placement.clientId ? clientIn(db, placement.clientId) : null;
      const invoice = placement.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
      const guarantee = allGuarantees.find((g) => g.placementId === placement.id) ?? null;

      const clientName = client?.name ?? "Client";
      const roleTitle = position?.title ?? placement.openingTaId;
      const overline = `${clientName} · ${roleTitle}`;

      // Categorize into: offer (missing joinDate or offer letter), joining (state === "placed" or "no_show"), guarantee (state === "joined"), replacement
      const isOffer =
        placement.state === "placed" && (!placement.joinDate || !placement.offerLetterFileRef);
      const isJoining =
        (placement.state === "placed" && Boolean(placement.joinDate && placement.offerLetterFileRef)) ||
        placement.state === "no_show";
      const isInGuarantee =
        placement.state === "joined" ||
        Boolean(guarantee && (guarantee.state === "running" || guarantee.state === "warned" || guarantee.state === "replacing"));
      const isReplacement =
        Boolean(placement.isReplacementOf) || guarantee?.state === "replacing";

      // Build card status & clock for Offers & Joining
      let offerJoiningStatus = placementInWords(placement, now);
      let offerJoiningTone: Tone = "brand";
      let offerJoiningClock = "";

      if (placement.state === "no_show") {
        offerJoiningStatus = "Didn’t join";
        offerJoiningTone = "danger";
        offerJoiningClock = placement.noShowChoice ? placement.noShowChoice : "Client chooses";
      } else if (isOffer) {
        offerJoiningStatus = "Deciding on the offer";
        offerJoiningTone = "warn";
        const createdDay = SHORT_DAYS[colomboDate(placement.createdAt).getUTCDay()];
        offerJoiningClock = `Since ${createdDay}`;
      } else if (placement.joinDate) {
        if (isSameDay(placement.joinDate, now) || placement.joinDate < now) {
          offerJoiningStatus = "Joining today";
          offerJoiningTone = "ok";
          offerJoiningClock = "9:00 call";
        } else {
          offerJoiningStatus = `Joins ${shortDate(placement.joinDate)}`;
          offerJoiningTone = "brand";
          offerJoiningClock =
            placement.dojHistory.length > 0
              ? `Date moved ${placement.dojHistory.length === 1 ? "once" : `${placement.dojHistory.length} times`}`
              : "On track";
        }
      }

      // Build card status & clock for In Guarantee
      let guaranteeStatus = "All well";
      let guaranteeTone: Tone = "ok";
      let guaranteeClock = "90 days";
      let guaranteeHref = `/placements/${placement.id}`;

      if (guarantee) {
        const totalDays = 90;
        const elapsedDays = Math.max(
          1,
          Math.min(totalDays, Math.ceil((now - guarantee.startsAt) / 86_400_000)),
        );
        const daysLeft = Math.max(0, Math.ceil((guarantee.endsAt - now) / 86_400_000));

        if (guarantee.state === "replacing") {
          guaranteeStatus = "Left · replacing";
          guaranteeTone = "warn";
          const elapsedWorking = guarantee.leftAt
            ? workingDaysBetween(guarantee.leftAt, now, holidays)
            : 1;
          guaranteeClock = `Day ${Math.max(1, elapsedWorking)} of 60`;
          guaranteeHref = `/guarantees/${guarantee.id}`;
        } else if (invoice && invoice.dueAt && invoice.dueAt < now && balanceOf(invoice) > 0) {
          guaranteeStatus = "Invoice late";
          guaranteeTone = "danger";
          guaranteeClock = `Day ${elapsedDays} of 90`;
        } else if (!guarantee.feePaidAt) {
          guaranteeStatus = "Awaiting fee payment";
          guaranteeTone = "warn";
          guaranteeClock = `Day ${elapsedDays} of 90`;
        } else if (daysLeft <= 15 && daysLeft > 0) {
          guaranteeStatus = `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
          guaranteeTone = "ok";
          guaranteeClock = `Day ${elapsedDays} of 90`;
        } else {
          guaranteeStatus = "All well";
          guaranteeTone = "ok";
          guaranteeClock = `Day ${elapsedDays} of 90`;
        }
      }

      return {
        placement,
        guarantee,
        owner,
        clientName,
        roleTitle,
        overline,
        isOffer,
        isJoining,
        isInGuarantee,
        isReplacement,
        offerJoiningStatus,
        offerJoiningTone,
        offerJoiningClock,
        guaranteeStatus,
        guaranteeTone,
        guaranteeClock,
        guaranteeHref,
      };
    })
    .filter((item) =>
      matchesQuery([
        item.placement.candidateName,
        item.clientName,
        item.roleTitle,
        item.owner,
        item.placement.state,
      ]),
    );

  // Also include standalone guarantees whose placement isn't in enrichedPlacements
  const standaloneGuarantees = allGuarantees
    .filter((g) => !enrichedPlacements.some((ep) => ep.placement.id === g.placementId))
    .map((g) => {
      const owner = memberIn(db, g.ownerId)?.name ?? "Unassigned";
      const client = g.clientId ? clientIn(db, g.clientId) : null;
      const clientName = client?.name ?? "Client";
      const overline = `${clientName} · ${g.openingTaId}`;
      const elapsedDays = Math.max(1, Math.min(90, Math.ceil((now - g.startsAt) / 86_400_000)));
      const daysLeft = Math.max(0, Math.ceil((g.endsAt - now) / 86_400_000));
      const isReplacing = g.state === "replacing";
      return {
        id: g.id,
        href: `/guarantees/${g.id}`,
        overline,
        owner,
        title: g.candidateName,
        statusText: isReplacing
          ? "Left · replacing"
          : daysLeft <= 15 && daysLeft > 0
            ? `Ends in ${daysLeft} days`
            : "All well",
        statusTone: (isReplacing ? "warn" : "ok") as Tone,
        clockText: isReplacing ? "Replacing" : `Day ${elapsedDays} of 90`,
        isReplacement: isReplacing,
      };
    })
    .filter((g) => matchesQuery([g.title, g.overline, g.owner]));

  const offersList = enrichedPlacements.filter((p) => p.isOffer);
  const joiningList = enrichedPlacements.filter((p) => p.isJoining);
  const offersAndJoiningList = enrichedPlacements.filter((p) => p.isOffer || p.isJoining);

  const inGuaranteeCards = [
    ...enrichedPlacements
      .filter((p) => p.isInGuarantee)
      .map((p) => ({
        id: p.placement.id,
        href: p.guaranteeHref,
        overline: p.overline,
        owner: p.owner,
        title: p.placement.candidateName,
        statusText: p.guaranteeStatus,
        statusTone: p.guaranteeTone,
        clockText: p.guaranteeClock,
        isReplacement: p.isReplacement,
      })),
    ...standaloneGuarantees,
  ];

  const replacementsList = [
    ...enrichedPlacements
      .filter((p) => p.isReplacement)
      .map((p) => ({
        id: p.placement.id,
        href: p.guarantee ? `/guarantees/${p.guarantee.id}` : `/placements/${p.placement.id}`,
        overline: p.overline,
        owner: p.owner,
        title: p.placement.candidateName,
        statusText: p.guarantee?.state === "replacing" ? "Left · replacing" : p.offerJoiningStatus,
        statusTone: (p.guarantee?.state === "replacing" ? "warn" : p.offerJoiningTone) as Tone,
        clockText: p.guarantee?.state === "replacing" ? p.guaranteeClock : p.offerJoiningClock,
      })),
    ...standaloneGuarantees.filter((g) => g.isReplacement),
  ];

  const views = [
    { key: "all", label: "All", count: enrichedPlacements.length + standaloneGuarantees.length, href: "/placements" },
    { key: "offers", label: "Offers", count: offersList.length, href: "/placements?view=offers" },
    { key: "joining", label: "Joining", count: joiningList.length, href: "/placements?view=joining" },
    { key: "guarantee", label: "In guarantee", count: inGuaranteeCards.length, href: "/placements?view=guarantee" },
    { key: "replacements", label: "Replacements", count: replacementsList.length, href: "/placements?view=replacements" },
  ];

  const showOffersAndJoining = view === "all" || view === "offers" || view === "joining";
  const showGuarantee = view === "all" || view === "guarantee";
  const showReplacementsOnly = view === "replacements";

  const displayedOffersJoining =
    view === "offers"
      ? offersList
      : view === "joining"
        ? joiningList
        : offersAndJoiningList;

  return (
    <PageBox width="full" className="gap-7">
      {/* Top Bar (1:2746) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ViewPills items={views} active={view} />

        <div className="flex flex-wrap items-center gap-2.5">
          <form action="/placements" method="get" className="flex items-center">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <div className="flex h-10 items-center gap-2 rounded-full bg-sunk px-4 text-[14px]">
              <Icon name="search" size={15} className="text-ink-faint" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Filter placements…"
                className="w-40 bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
          </form>
          <Link
            href="/guarantees"
            className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-4 py-2 text-[14px] text-ink-soft transition-colors hover:text-ink"
          >
            Guarantees
          </Link>
          <Link
            href="/closes"
            className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-4 py-2 text-[14px] text-ink-soft transition-colors hover:text-ink"
          >
            Closing checklists
          </Link>
        </div>
      </div>

      {msg && (
        <p className="rounded-[20px] bg-brand-tint px-5 py-3 text-[14px] font-medium text-brand-ink">
          {msg}
        </p>
      )}

      {/* Section 1: Offers and joining (1:2752) */}
      {showOffersAndJoining && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[26px] font-normal leading-[34px] text-ink">
              {view === "offers"
                ? "Offers"
                : view === "joining"
                  ? "Joining"
                  : "Offers and joining"}
            </h2>
            <span className="text-[14px] leading-[21px] text-ink-faint">
              {displayedOffersJoining.length}
            </span>
            <div className="flex-1" />
            {view === "all" && (
              <Link
                href="/placements?view=joining"
                className="inline-flex items-center gap-1.5 text-[14px] leading-[21px] text-ink hover:underline"
              >
                <span>See all</span>
                <Icon name="arrow-right" size={16} />
              </Link>
            )}
          </div>

          {displayedOffersJoining.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No active offers or upcoming joiners right now. A placement arrives from the TA System the day it is made.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {displayedOffersJoining.map((item) => (
                <RecordCard
                  outline
                  key={item.placement.id}
                  href={`/placements/${item.placement.id}`}
                  overline={item.overline}
                  ownerName={item.owner}
                  title={item.placement.candidateName}
                  statusText={item.offerJoiningStatus}
                  statusTone={item.offerJoiningTone}
                  clockText={item.offerJoiningClock}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 2: In guarantee (1:2767) */}
      {showGuarantee && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[26px] font-normal leading-[34px] text-ink">
              In guarantee
            </h2>
            <span className="text-[14px] leading-[21px] text-ink-faint">
              {inGuaranteeCards.length}
            </span>
            <div className="flex-1" />
            <Link
              href="/guarantees"
              className="inline-flex items-center gap-1.5 text-[14px] leading-[21px] text-ink hover:underline"
            >
              <span>See all</span>
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {inGuaranteeCards.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No guarantee is running right now. One starts by itself the day somebody joins, and runs ninety days from that day.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {inGuaranteeCards.map((card) => (
                <RecordCard
                  outline
                  key={card.id}
                  href={card.href}
                  overline={card.overline}
                  ownerName={card.owner}
                  title={card.title}
                  statusText={card.statusText}
                  statusTone={card.statusTone}
                  clockText={card.clockText}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Replacements view */}
      {showReplacementsOnly && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[26px] font-normal leading-[34px] text-ink">
              Replacements
            </h2>
            <span className="text-[14px] leading-[21px] text-ink-faint">
              {replacementsList.length}
            </span>
          </div>

          {replacementsList.length === 0 ? (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              No replacement searches or replacement placements right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {replacementsList.map((card) => (
                <RecordCard
                  outline
                  key={card.id}
                  href={card.href}
                  overline={card.overline}
                  ownerName={card.owner}
                  title={card.title}
                  statusText={card.statusText}
                  statusTone={card.statusTone}
                  clockText={card.clockText}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </PageBox>
  );
}
