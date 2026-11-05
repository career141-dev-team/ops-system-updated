import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, placementsNewestFirst, runClocks } from "@/data/desk";
import { money, placementInWords } from "@/lib/money";
import { currentMember } from "@/lib/session";

/**
 * Placements (15, Phase 6).
 *
 * The TA System makes the placement; this is the part that pays for
 * everything. Three lists: who is joining, who has joined, and the ones that
 * never happened. Nothing here is typed in from scratch — a placement arrives
 * from TA's own event the day it is made, which is the whole point of it.
 */
export default async function PlacementsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = placementsNewestFirst(db);
  const joining = all.filter((p) => p.state === "placed");
  const joined = all.filter((p) => p.state === "joined");
  const gone = all.filter((p) => p.state === "no_show" || p.state === "cancelled");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((placement) => (
        <div key={placement.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/placements/" + placement.id} className="text-[13.5px] text-brand hover:underline">
              {placement.candidateName}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {placementInWords(placement, now)}
              {placement.monthlySalary
                ? " · " + money(placement.monthlySalary, placement.currency) + " a month"
                : " · no package yet"}
            </p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">Placements</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A placement arrives from the TA System the day it is made, and accounts and the ops owner are told the same
          day. The fee is invoiced when the person joins, due thirty days from their first working day.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {list("Joining", joining, "Nobody is waiting to join.")}
      {list("Joined", joined, "Nobody has joined yet.")}
      {gone.length > 0 && list("Never happened", gone, "")}
    </div>
  );
}
