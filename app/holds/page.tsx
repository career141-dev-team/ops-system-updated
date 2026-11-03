import Link from "next/link";
import { redirect } from "next/navigation";

import { clientIn, desk, holdsNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { HOLD_MEANINGS, type HoldState } from "@/lib/clientFeedback";
import { currentMember } from "@/lib/session";

/**
 * Positions held because the client went quiet (15, Phase 4 steps 12 and 13).
 *
 * The owner's decision 6: a hold never closes by itself. So this screen exists
 * to be looked at — what is waiting for somebody to approve a notice, what is
 * held and for how long, and which ones are due their thirty-day review.
 */
export default async function HoldsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const holds = holdsNewestFirst(db);
  const groups: { state: HoldState; rows: typeof holds }[] = [
    { state: "proposed", rows: holds.filter((h) => h.state === "proposed") },
    { state: "on_hold", rows: holds.filter((h) => h.state === "on_hold") },
    { state: "lifted", rows: holds.filter((h) => h.state === "lifted") },
  ];

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "border-t border-rule py-3 first:border-t-0";
  const days = (from: number) => Math.max(0, Math.round((now - from) / 86_400_000));

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Held positions</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A client who has gone quiet does not lose their position: it goes on hold with a notice they actually
          receive, and it never closes by itself — somebody is asked about it every thirty days until they decide.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {holds.length === 0 && (
        <section className={card}>
          <p className="text-[13px] text-ink-soft">
            Nothing is on hold. One appears here when a set has been with a client for two weeks with nothing back.
          </p>
        </section>
      )}

      {groups.map(({ state, rows }) => {
        if (!rows.length) return null;
        return (
          <section key={state} className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[14.5px] font-medium">{HOLD_MEANINGS[state]}</h2>
              <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
            </div>
            {rows.map((hold) => {
              const client = hold.clientId ? clientIn(db, hold.clientId) : null;
              const due = hold.reviewAt !== null && hold.reviewAt <= now;
              return (
                <div key={hold.id} className={row}>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <Link href={"/holds/" + hold.id} className="text-[13.5px] text-brand hover:underline">
                      {client?.name ?? hold.openingTaId}
                    </Link>
                    {state === "on_hold" && (
                      <span className={"text-[12px] " + (due ? "text-warning" : "text-ink-faint")}>
                        {days(hold.heldAt ?? hold.proposedAt)} days
                        {due ? " · due its thirty-day look" : ""}
                      </span>
                    )}
                    <span className="ml-auto text-[12px] text-ink-faint">
                      {memberIn(db, hold.ownerId)?.name ?? "nobody"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    {hold.state === "lifted" ? hold.liftedReason ?? hold.reason : hold.reason}
                  </p>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
