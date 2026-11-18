import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, PageBox, RecordCard, ViewPills, type Tone } from "@/app/ui/figma";
import {
  clientIn,
  desk,
  guaranteesNewestFirst,
  member as memberIn,
  placementIn,
  positionIn,
  runClocks,
} from "@/data/desk";
import { workingDaysBetween } from "@/lib/calendar";
import { daysLeftInWords, guaranteeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Guarantees index (`/guarantees`) — inside the Placements workspace.
 */
export default async function GuaranteesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; view?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, view = "all" } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = guaranteesNewestFirst(db);
  const holidays = db.holidays.map((h) => h.date);
  const query = (q ?? "").trim().toLowerCase();

  const cards = all
    .map((guarantee) => {
      const owner = memberIn(db, guarantee.ownerId)?.name ?? "Unassigned";
      const placement = placementIn(db, guarantee.placementId);
      const position = placement?.positionId ? positionIn(db, placement.positionId) : null;
      const client = guarantee.clientId ? clientIn(db, guarantee.clientId) : null;
      const clientName = client?.name ?? "Client";
      const roleTitle = position?.title ?? guarantee.openingTaId;
      const overline = `${clientName} · ${roleTitle}`;

      const elapsedDays = Math.max(1, Math.min(90, Math.ceil((now - guarantee.startsAt) / 86_400_000)));
      const daysLeft = Math.max(0, Math.ceil((guarantee.endsAt - now) / 86_400_000));
      const unpaid = !guarantee.feePaidAt && (guarantee.state === "running" || guarantee.state === "warned");

      let statusText = guaranteeInWords(guarantee, now, holidays);
      let statusTone: Tone = "ok";
      let clockText = `Day ${elapsedDays} of 90`;

      if (guarantee.state === "replacing") {
        statusText = "Left · replacing";
        statusTone = "warn";
        const elapsedWorking = guarantee.leftAt
          ? workingDaysBetween(guarantee.leftAt, now, holidays)
          : 1;
        clockText = `Day ${Math.max(1, elapsedWorking)} of 60`;
      } else if (guarantee.state === "refund_pending") {
        statusText = "Refund pending";
        statusTone = "warn";
        clockText = "Awaiting credit note";
      } else if (unpaid) {
        statusText = "Fee unpaid";
        statusTone = "danger";
      } else if (daysLeft <= 15 && daysLeft > 0) {
        statusText = `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
        statusTone = "ok";
      } else if (guarantee.state === "running" || guarantee.state === "warned") {
        statusText = "All well";
        statusTone = "ok";
      } else {
        statusText = guarantee.state.replace(/_/g, " ");
        statusTone = "neutral";
      }

      return {
        guarantee,
        owner,
        overline,
        statusText,
        statusTone,
        clockText,
      };
    })
    .filter((c) => {
      if (!query) return true;
      return [c.guarantee.candidateName, c.overline, c.owner, c.statusText].some((w) =>
        w.toLowerCase().includes(query),
      );
    });

  const running = cards.filter(
    (c) => c.guarantee.state === "running" || c.guarantee.state === "warned",
  );
  const replacing = cards.filter(
    (c) => c.guarantee.state === "replacing" || c.guarantee.state === "refund_pending",
  );
  const ended = cards.filter(
    (c) =>
      c.guarantee.state !== "running" &&
      c.guarantee.state !== "warned" &&
      c.guarantee.state !== "replacing" &&
      c.guarantee.state !== "refund_pending",
  );

  const shown =
    view === "running"
      ? running
      : view === "replacing"
        ? replacing
        : view === "ended"
          ? ended
          : cards;

  const views = [
    { key: "all", label: "All", count: cards.length, href: "/guarantees" },
    { key: "running", label: "Running", count: running.length, href: "/guarantees?view=running" },
    { key: "replacing", label: "Replacing / Refund", count: replacing.length, href: "/guarantees?view=replacing" },
    { key: "ended", label: "Ended", count: ended.length, href: "/guarantees?view=ended" },
  ];

  const soonest = all
    .filter((one) => one.state === "running" || one.state === "warned")
    .sort((a, b) => a.endsAt - b.endsAt)[0];

  return (
    <PageBox width="full" className="gap-6">
      <BackBar href="/placements" label="Placements" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-light leading-[40px] text-ink">
            90-day guarantees
          </h1>
          <p className="max-w-[70ch] text-[14px] text-ink-soft">
            Ninety days from the day somebody joined — not from the payment — and only valid while the fee is fully
            paid. If somebody leaves, a replacement comes first.
          </p>
        </div>

        <form action="/guarantees" method="get" className="flex items-center">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <div className="flex h-10 items-center gap-2 rounded-full bg-sunk px-4 text-[14px]">
            <Icon name="search" size={15} className="text-ink-faint" />
            <input
              type="search"
              name="q" autoComplete="off"
              defaultValue={q ?? ""}
              placeholder="Filter guarantees…"
              className="w-40 bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        </form>
      </div>

      <ViewPills items={views} active={view} />

      {msg && (
        <p className="rounded-[20px] bg-brand-tint px-5 py-3 text-[14px] font-medium text-brand-ink">
          {msg}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          No guarantee records match this filter. One starts by itself the day somebody joins, and runs ninety days from that day.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((c) => (
            <RecordCard
              key={c.guarantee.id}
              href={`/guarantees/${c.guarantee.id}`}
              overline={c.overline}
              ownerName={c.owner}
              title={c.guarantee.candidateName}
              statusText={c.statusText}
              statusTone={c.statusTone}
              clockText={c.clockText}
            />
          ))}
        </div>
      )}

      {soonest && (
        <p className="text-[13px] text-ink-faint">
          The soonest ends in {daysLeftInWords(soonest.endsAt, now)}.
        </p>
      )}
    </PageBox>
  );
}
