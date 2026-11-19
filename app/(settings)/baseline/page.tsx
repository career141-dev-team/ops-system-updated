import { redirect } from "next/navigation";

import { recordBaseline } from "@/app/actions";
import { desk } from "@/data/desk";
import { MEASURES } from "@/lib/baseline";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * How bad it is today (15, Phase 1 step 0).
 *
 * The owner's instruction was strategy first: measure today's numbers — how
 * long an agreement takes to come back, how long a client waits for a set, how
 * many hires slip — before anything changes. Otherwise the weekly report in
 * Phase 7 can say what is happening but never what got better.
 *
 * These are typed in from the archive by the Ops team, because no system holds
 * them. Nothing is invented here: an empty list is honest and a made-up number
 * would quietly become the thing we compare against for years.
 */
export default async function BaselinePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayRecord = can(member, "report.read");

  const db = await desk();
  const rows = [...db.baseline].sort((a, b) => b.at - a.at);
  const field = "rounded-[10px] border border-rule bg-surface px-3.5 py-2.5 text-[14px]";
  const nameOf = (id: string) => db.members.find((m) => m.id === id)?.name ?? "somebody";

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">Today&apos;s numbers</h1>
        <p className="t-small text-ink-3">
        What the last six months really looked like, from the archive. The weekly report compares against these.
      </p>
      </div>

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">Record a number</h2>
        {mayRecord ? (
          <form action={recordBaseline} className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              What is being measured
              <select name="measure" className={field}>
                {Object.entries(MEASURES).map(([key, measure]) => (
                  <option key={key} value={key}>
                    {measure.name} ({measure.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                The number
                <input name="value" inputMode="decimal" required className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Which months
                <input name="period" placeholder="May to October 2026" required className={field} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Where it came from
              <input name="note" placeholder="counted from the ESA folder, 14 clients" className={field} />
            </label>
            <button className="self-start rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium hover:bg-sunk">
              Record it
            </button>
          </form>
        ) : (
          <p className="mt-2 text-[13px] text-ink-faint">Your role does not include reports.</p>
        )}
      </section>

      <section className="rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <h2 className="t-h2">What is measured, and why</h2>
        {Object.entries(MEASURES).map(([key, measure]) => {
          const known = rows.filter((r) => r.measure === key);
          return (
            <div key={key} className="border-t border-rule py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-[13.5px]">{measure.name}</span>
                <span className="ml-auto text-[13px]">
                  {known.length === 0 ? (
                    <span className="text-ink-faint">not measured yet</span>
                  ) : (
                    known[0].value + " " + measure.unit + " · " + known[0].period
                  )}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-faint">{measure.why}</p>
              {known.slice(1).map((row) => (
                <p key={row.id} className="mt-1 text-[12px] text-ink-faint">
                  also {row.value} {measure.unit} for {row.period}
                  {row.note ? " · " + row.note : ""} · {nameOf(row.by)}
                </p>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}
