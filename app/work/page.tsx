import Link from "next/link";
import { redirect } from "next/navigation";

import {
  agreementForLead,
  clientIn,
  desk,
  leadsNewestFirst,
  liveHoldFor,
  meetingsForLead,
  member as memberIn,
  openChecklistFor,
  positionsNewestFirst,
  requirementForLead,
  runClocks,
} from "@/data/desk";
import { REQUIREMENT_FIELDS } from "@/lib/requirements";
import { STAGES, rowsInStage, sittingFor, stageOfLead, stageOfPosition, type JourneyRow } from "@/lib/journey";
import { leadNextStep, positionNextStep, setNextStep } from "@/lib/nextStep";
import { MIN_CVS } from "@/lib/clientSets";
import { depthInWords } from "@/lib/depth";
import { currentMember } from "@/lib/session";

/**
 * The work, by where it is (24, section 12).
 *
 * The owner's point on 5 November: the TA System's screens follow how a TA
 * works, and this one followed what things *are* - clients here, the search
 * there, money somewhere else. A person opening it still had to know which
 * drawer their Tuesday was in.
 *
 * So this is one screen: every lead and every position, in the stage it is
 * really in, with the same sentence its own page shows. Which stage is
 * decided in `src/lib/journey.ts` and nowhere else; what is waiting comes
 * from the same rules the cards use. The board cannot drift from the pages,
 * because it is reading them.
 */
export default async function WorkPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const required = REQUIREMENT_FIELDS.filter((field) => field.required).map((field) => field.key);

  const rows: JourneyRow[] = [];

  // Leads, up to the agreement. After it they are a client with positions,
  // and the position is what moves.
  for (const lead of leadsNewestFirst(db)) {
    const meetings = meetingsForLead(db, lead.id);
    const esa = agreementForLead(db, lead.id);
    const requirement = requirementForLead(db, lead.id);
    const position = requirement ? (db.positions.find((row) => row.requirementId === requirement.id) ?? null) : null;
    // Once TA has the opening the position is the thing on the board, so the
    // lead drops off rather than being shown twice.
    if (position?.openingTaId) continue;

    const step = leadNextStep(lead, { meetings, esa, requirement, position, requiredFields: required }, now);
    const stage = stageOfLead(lead, {
      heldIntro: meetings.some((meeting) => meeting.kind === "intro" && meeting.state === "held"),
      esaState: esa?.state ?? null,
    });
    rows.push({
      id: lead.id,
      href: "/leads/" + lead.id,
      title: lead.company,
      under: memberIn(db, lead.ownerId)?.name ?? "nobody",
      stage,
      waiting: step.waiting,
      since: esa?.sentAt ?? lead.createdAt,
      ownerId: lead.ownerId,
      late: Boolean(esa?.expiresAt && esa.expiresAt < now),
    });
  }

  // Positions: everything after the hand-over, to the close.
  for (const position of positionsNewestFirst(db)) {
    const client = position.clientId ? clientIn(db, position.clientId) : null;
    const sets = db.clientSets.filter((set) => set.openingTaId === position.openingTaId);
    const sent = sets.filter((set) => set.state === "sent");
    const waitingSet = sent.find((set) => set.candidates.some((who) => !who.decision)) ?? null;
    const hold = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;
    const placement =
      db.placements.find((row) => row.openingTaId === position.openingTaId && row.state !== "cancelled") ?? null;
    const invoice = placement
      ? (db.invoices.find((row) => row.placementId === placement.id && row.state !== "paid" && row.state !== "written_off") ?? null)
      : null;
    const guarantee = placement
      ? (db.guarantees.find((row) => row.placementId === placement.id && (row.state === "running" || row.state === "warned")) ?? null)
      : null;
    const interview =
      db.interviews.find(
        (row) =>
          row.openingTaId === position.openingTaId &&
          ["slots", "agreed", "booked", "reconfirmed"].includes(row.state),
      ) ?? null;
    const closed = openChecklistFor(db, position.openingTaId ?? "")?.completedAt ?? null;

    const stage = stageOfPosition(position, {
      setWithClient: Boolean(waitingSet),
      liveInterview: Boolean(interview),
      placement: placement ? { joinedAt: placement.joinedAt, state: placement.state } : null,
      invoiceOwing: Boolean(invoice),
      guaranteeRunning: Boolean(guarantee),
      closed: Boolean(closed),
    });

    // The sentence is the one that thing's own page shows: the set's card
    // while a set is with the client, the position's otherwise.
    const waiting =
      stage === "with_client" && waitingSet
        ? setNextStep(
            waitingSet,
            { minCvs: MIN_CVS, ownershipClosesAt: null, feedback: null, holdState: hold ? hold.state : null },
            now,
          ).waiting
        : positionNextStep(
            position,
            {
              queued: !position.openingTaId,
              depthSaid: position.openingTaId ? depthInWords(position) : null,
              holdState: hold ? hold.state : null,
              setsSent: sent.length,
            },
            now,
          ).waiting;

    rows.push({
      id: position.id,
      href: "/positions/" + position.id,
      title: (client?.name ?? position.clientTaId) + " · " + position.title,
      under: memberIn(db, position.ownerId)?.name ?? "nobody",
      stage,
      waiting,
      since: position.updatedAt ?? position.createdAt,
      ownerId: position.ownerId,
      late: Boolean(invoice?.dueAt && invoice.dueAt < now) || hold?.state === "proposed",
    });
  }

  // Work that belongs to no position of ours.
  //
  // TA's event can hand us a set for an opening we never created a position
  // for - a TA opening one by hand, which the plan says happens. Without this
  // the set has every clock running and appears on no board, which is the one
  // thing a board must never do.
  const onBoard = new Set(rows.map((row) => row.id));
  for (const set of db.clientSets) {
    const position = db.positions.find((row) => row.openingTaId === set.openingTaId);
    if (position && onBoard.has(position.id)) continue;
    if (set.state === "withdrawn") continue;
    const step = setNextStep(
      set,
      { minCvs: MIN_CVS, ownershipClosesAt: null, feedback: null, holdState: null },
      now,
    );
    rows.push({
      id: set.id,
      href: "/sets/" + set.id,
      title: set.name,
      under: memberIn(db, set.ownerId)?.name ?? "nobody",
      stage: set.state === "sent" ? "with_client" : "with_ta",
      waiting: step.waiting + " (no position of ours - TA opened this one)",
      since: set.updatedAt ?? set.createdAt,
      ownerId: set.ownerId,
      late: Boolean(set.dueAt && set.dueAt < now && set.state !== "sent"),
    });
  }

  const mine = rows.filter((row) => row.ownerId === me.id).length;

  // In progress above, closed below: the owner's two screens do the same, and
  // for the same reason - finished work is a record, not a queue.
  const live = STAGES.filter((stage) => stage.key !== "closed");
  const done = rowsInStage(rows, "closed");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">The work</h1>
        <p className="mt-0.5 max-w-[80ch] text-[13px] text-ink-soft">
          Every enquiry and every position, in the stage it is really in. {rows.length}{" "}
          {rows.length === 1 ? "thing" : "things"} in all, {mine} of them yours. A stage is where the work has got
          to, not something you drag: it moves when the thing itself moves.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section>
        <h2 className="text-[13px] font-medium text-ink-soft">
          In progress <span className="ml-1 text-ink-faint">{rows.length - done.length}</span>
        </h2>

        {/* The board. It scrolls sideways rather than wrapping: eleven stages
            in a fixed order is the point, and a wrapped column is a column
            somebody stops trusting the order of. */}
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
          {live.map((stage) => {
            const theirs = rowsInStage(rows, stage.key);
            return (
              <div key={stage.key} className="flex w-[260px] shrink-0 flex-col gap-2">
                <div className="rounded-xl border border-rule bg-surface px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rule-strong" aria-hidden="true" />
                    <span className="text-[13px] font-medium">{stage.what}</span>
                    <span className="ml-auto text-[12px] text-ink-faint">{theirs.length || "—"}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{stage.about}</p>
                </div>

                {theirs.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="block rounded-xl border border-rule bg-surface px-3 py-2.5 hover:border-rule-strong"
                  >
                    <p className="text-[13px] font-medium leading-snug">{row.title}</p>
                    <p className={"mt-1 text-[12px] leading-snug " + (row.late ? "text-danger" : "text-ink-soft")}>
                      {row.waiting}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-ink-faint">
                      {sittingFor(row.since, now)} here · {row.under}
                    </p>
                  </Link>
                ))}

                {theirs.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-ink-faint">Nothing here.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium text-ink-soft">
            Closed <span className="ml-1 text-ink-faint">{done.length}</span>
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((row) => (
              <Link
                key={row.id}
                href={row.href}
                className="block rounded-xl border border-rule bg-paper px-3 py-2.5 hover:border-rule-strong"
              >
                <p className="text-[13px] leading-snug text-ink-soft">{row.title}</p>
                <p className="mt-1 text-[11.5px] text-ink-faint">{row.waiting}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
