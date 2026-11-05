import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, guaranteesNewestFirst, runClocks } from "@/data/desk";
import { daysLeftInWords, guaranteeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Guarantees (15, Phase 7).
 *
 * Ninety days from joining, and only valid while the fee is fully paid. Three
 * lists: the ones running, the ones where somebody left, and the ones that
 * are over. "Ending this month" is first, because that is the one worth
 * reading on a Monday.
 */
export default async function GuaranteesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const month = 30 * 86_400_000;
  const db = await desk();
  const all = guaranteesNewestFirst(db);
  const holidays = db.holidays.map((h) => h.date);
  const running = all.filter((g) => g.state === "running" || g.state === "warned");
  const endingSoon = running.filter((g) => g.endsAt - now < month);
  const later = running.filter((g) => g.endsAt - now >= month);
  const left = all.filter((g) => g.state === "replacing" || g.state === "refund_pending");
  const over = all.filter(
    (g) => g.state === "ended_clean" || g.state === "replaced" || g.state === "void" || g.state === "refunded",
  );

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((guarantee) => (
        <div key={guarantee.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/guarantees/" + guarantee.id} className="text-[13.5px] text-brand hover:underline">
              {guarantee.candidateName}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {guaranteeInWords(guarantee, now, holidays)}
              {!guarantee.feePaidAt && (guarantee.state === "running" || guarantee.state === "warned")
                ? " · the fee is not paid in full, so it would not hold"
                : ""}
            </p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">Guarantees</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Ninety days from the day somebody joined — not from the payment — and only valid while the fee is fully
          paid. A warning on day 75. If somebody leaves, a replacement comes first; a refund is the Director&rsquo;s
          decision, never a clock running out.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {list("Ending within the month", endingSoon, "None ending this month.")}
      {list("Somebody left", left, "Nobody has left inside a guarantee.")}
      {list("Running", later, "None running.")}
      {over.length > 0 && list("Over", over, "")}

      {endingSoon.length > 0 && (
        <p className="text-[12px] text-ink-faint">
          The soonest ends in {daysLeftInWords(endingSoon[endingSoon.length - 1].endsAt, now)}.
        </p>
      )}
    </div>
  );
}
