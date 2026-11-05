import Link from "next/link";
import { redirect } from "next/navigation";

import { clientIn, desk, liveHoldFor, member as memberIn, outboxWaiting, positionsNewestFirst, runClocks } from "@/data/desk";
import { depthInWords } from "@/lib/depth";
import { positionNextStep } from "@/lib/nextStep";
import { STAGE_MEANINGS, type PositionStage } from "@/lib/requirements";
import { currentMember } from "@/lib/session";

/**
 * The positions we have handed to the TA System (15, Phase 3 step 17).
 *
 * TA owns the opening and does the searching; this is Ops's own view of it, so
 * a client can be answered without opening the TA System: which of their roles
 * are being worked, which are waiting for TA to confirm the opening, and which
 * are closed.
 */
export default async function PositionsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const db = await desk();
  const positions = positionsNewestFirst(db);
  const order: PositionStage[] = ["handed_over", "searching", "on_hold", "closed"];
  // One line per row, from the same rule the position's own page uses, so the
  // list and the page can never say different things (24, section 3).
  const now = Date.now();
  const queuedIds = new Set(
    outboxWaiting(db).filter((o) => o.subjectType === "position").map((o) => o.subjectId),
  );
  const stepFor = (position: (typeof positions)[number]) =>
    positionNextStep(
      position,
      {
        queued: queuedIds.has(position.id),
        depthSaid: position.openingTaId ? depthInWords(position) : null,
        holdState: position.openingTaId ? liveHoldFor(db, position.openingTaId)?.state ?? null : null,
        setsSent: db.clientSets.filter((c) => c.openingTaId === position.openingTaId && c.state === "sent").length,
      },
      now,
    );

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "border-t border-rule py-3 first:border-t-0";

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">Positions</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A requirement that has been handed over. The TA System owns the opening and the search; this is what Ops
          needs in order to answer the client — including the ones TA has not confirmed yet.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {positions.length === 0 && (
        <section className={card}>
          <p className="text-[13px] text-ink-soft">
            Nothing handed over yet. A position appears here when a requirement goes to the TA System.
          </p>
        </section>
      )}

      {order.map((stage) => {
        const theirs = positions.filter((p) => p.stage === stage);
        if (!theirs.length) return null;
        return (
          <section key={stage} className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[14.5px] font-medium">{STAGE_MEANINGS[stage]}</h2>
              <span className="text-[12.5px] text-ink-soft">{theirs.length}</span>
            </div>
            {theirs.map((position) => {
              const client = position.clientId ? clientIn(db, position.clientId) : null;
              return (
                <div key={position.id} className={row}>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <Link href={"/positions/" + position.id} className="text-[13.5px] text-brand hover:underline">
                      {position.title}
                    </Link>
                    <span className="text-[12.5px] text-ink-soft">{client?.name ?? position.clientTaId}</span>
                    {position.openingTaId ? (
                      <span className="text-[12px] text-ink-faint">opening {position.openingTaId}</span>
                    ) : (
                      <span className="text-[12px] text-warning">waiting for TA to confirm the opening</span>
                    )}
                    <span className="ml-auto text-[12px] text-ink-faint">
                      {memberIn(db, position.ownerId)?.name ?? "nobody"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{stepFor(position).waiting}</p>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
