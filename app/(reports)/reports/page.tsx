import Link from "next/link";
import { redirect } from "next/navigation";

import { buildWeeklyReportNow } from "@/app/actions";
import { desk, reportsNewestFirst, runClocks } from "@/data/desk";
import { reportInWords, reportWeekOf } from "@/lib/reports";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The weekly report (15, Phase 3 step 18 and Phase 7 step 9).
 *
 * The owner's rule: the report is built by the system and reviewed by the TA
 * lead on a Monday, then it goes to the Director. Today it is made by hand
 * from a sheet, which is why it is late or wrong. Each week's report is kept
 * as it was built, so last Monday's still says what it said last Monday.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const reports = reportsNewestFirst(db);
  const thisWeek = reports.find((r) => r.weekOf === reportWeekOf(now)) ?? null;
  const earlier = reports.filter((r) => r.id !== thisWeek?.id);
  const recipients = String(db.settings.find((s) => s.key === "report.recipients")?.value ?? "").trim();

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">The weekly report</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Every open position, where it stands, and who is waiting for whom. Built at eight on a Monday morning, read
          by the ops lead, then sent to the Director as a drafted email.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {!recipients && (
        <p className="rounded-lg border border-warning bg-surface px-3 py-2 text-[13px]">
          Nobody is set to receive it. Put the Director&rsquo;s address in{" "}
          <Link href="/settings" className="text-brand hover:underline">
            the settings
          </Link>{" "}
          under <span className="font-medium">report.recipients</span>, or approving a report has nowhere to send it.
        </p>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">This week</h2>
        {thisWeek ? (
          <div className={row}>
            <div className="min-w-0 flex-1">
              <Link href={"/reports/" + thisWeek.id} className="text-[13.5px] text-brand hover:underline">
                Week of {thisWeek.weekOf}
              </Link>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{reportInWords(thisWeek)}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-ink-soft">
              Nothing built for the week of {reportWeekOf(now)} yet. It builds itself on Monday morning; you can also
              do it now.
            </p>
            {can(me, "report.read") && (
              <form action={buildWeeklyReportNow} className="mt-3">
                <button className={plain}>Build this week&apos;s report</button>
              </form>
            )}
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">Earlier weeks</h2>
        {earlier.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">None yet.</p>}
        {earlier.map((report) => (
          <div key={report.id} className={row}>
            <div className="min-w-0 flex-1">
              <Link href={"/reports/" + report.id} className="text-[13.5px] text-brand hover:underline">
                Week of {report.weekOf}
              </Link>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{reportInWords(report)}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
