import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { approveWeeklyReport } from "@/app/actions";
import { desk, member as memberIn, reportIn } from "@/data/desk";
import { REPORT_MEANINGS, type ReportState, problemWithReport, reportText, rowInWords } from "@/lib/reports";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One week's report: every line, and the Director's email once it is read. */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg } = await searchParams;

  const db = await desk();
  const report = reportIn(db, id);
  if (!report) notFound();

  const problem = problemWithReport(report.rows);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "border-t border-rule py-3 first:border-t-0";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";

  // Grouped by client, the way the Director reads it.
  const clients = [...new Set(report.rows.map((r) => r.client))].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <Link href="/reports" className="text-[12.5px] text-brand hover:underline">
          Back to the reports
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">Week of {report.weekOf}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {REPORT_MEANINGS[report.state as ReportState] ?? report.state} · built {whenLocal(report.builtAt)}
          {report.approvedBy && " · read by " + (memberIn(db, report.approvedBy)?.name ?? "somebody")}
        </p>
        {report.note && <p className="mt-1 text-[12.5px] text-warning">{report.note}</p>}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">
          {report.rows.length} {report.rows.length === 1 ? "position" : "positions"}
        </h2>
        {report.rows.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">
            No position was open in this week, so there is nothing to send.
          </p>
        )}
        {clients.map((client) => (
          <div key={client} className={row}>
            <p className="text-[13.5px] font-medium">{client}</p>
            {report.rows
              .filter((r) => r.client === client)
              .map((line) => (
                <p key={line.positionId} className="mt-1 text-[13px]">
                  <Link href={"/positions/" + line.positionId} className="text-brand hover:underline">
                    {line.title}
                  </Link>{" "}
                  <span className="text-ink-soft">
                    ({line.primaryTa}) — {rowInWords(line)}
                  </span>
                </p>
              ))}
          </div>
        ))}
      </section>

      {report.state === "review" && can(me, "report.read") && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Read it, then approve it</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            Approving drafts the Director&rsquo;s email. If a line is wrong, fix it where it lives — on the position or
            the set — and build the report again; nothing here is edited by hand, or the report would stop matching the
            work.
          </p>
          {problem ? (
            <p className="mt-2 text-[13px] text-warning">{problem}</p>
          ) : (
            <form action={approveWeeklyReport} className="mt-3 flex flex-col">
              <input type="hidden" name="reportId" value={report.id} />
              <button className={button}>Approve, and draft the Director&apos;s email</button>
            </form>
          )}
        </section>
      )}

      {report.messageId && (
        <p className="text-[13px]">
          <Link href={"/messages/" + report.messageId} className="text-brand hover:underline">
            The Director&rsquo;s email
          </Link>{" "}
          <span className="text-ink-soft">— it still waits for somebody to send it.</span>
        </p>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">As the Director will read it</h2>
        <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">
          {reportText(report.weekOf, report.rows) || "Nothing to read."}
        </p>
      </section>
    </div>
  );
}
