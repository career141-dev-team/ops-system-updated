import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { approveWeeklyReport } from "@/app/actions";
import { desk, member as memberIn, reportIn } from "@/data/desk";
import {
  BackBar,
  FoldRow,
  PageBox,
  StatTile,
  StatusChip,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  REPORT_MEANINGS,
  type ReportState,
  problemWithReport,
  reportText,
  rowInWords,
} from "@/lib/reports";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

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
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const clients = [...new Set(report.rows.map((r) => r.client))].sort((a, b) =>
    a.localeCompare(b),
  );
  const cardShell = "rounded-[24px] border border-edge bg-surface p-5";

  return (
    <PageBox width="1080">
      <div className="flex flex-col gap-6">
        <BackBar href="/reports" label="Reports" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Weekly TA report
            </p>
            <h1 className="mt-1 font-serif text-[30px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
              Week of {report.weekOf}
            </h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Built {whenLocal(report.builtAt)}
              {report.approvedBy
                ? ` · read by ${memberIn(db, report.approvedBy)?.name ?? "somebody"}`
                : ""}
            </p>
          </div>
          <StatusChip tone={report.state === "sent" ? "ok" : "warn"}>
            {REPORT_MEANINGS[report.state as ReportState] ?? report.state}
          </StatusChip>
        </div>

        {report.note && (
          <div className="rounded-[18px] border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink">
            {report.note}
          </div>
        )}

        {msg && (
          <div className="rounded-[18px] border border-brand/25 bg-bg-brand px-4 py-3 text-[13px] font-medium text-ink">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile value={String(report.rows.length)} label="positions covered" />
          <StatTile value={String(clients.length)} label="clients" />
          <StatTile
            value={report.state === "sent" ? "Sent" : "In review"}
            label="Director email"
          />
        </div>

        {report.state === "review" && can(me, "report.read") && (
          <div className={cardShell}>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              READ &amp; APPROVE
            </div>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              Approving drafts the Director&rsquo;s email. If a line is wrong, fix it on the
              position or set and rebuild the report.
            </p>
            {problem ? (
              <p className="mt-2 text-[13px] font-medium text-warn">{problem}</p>
            ) : (
              <form action={approveWeeklyReport} className="mt-4">
                <input type="hidden" name="reportId" value={report.id} />
                <button type="submit" className={pillPrimary}>
                  Approve, and draft the Director&apos;s email
                </button>
              </form>
            )}
          </div>
        )}

        {report.messageId && (
          <div>
            <Link href={`/messages/${report.messageId}`} className={pillSecondary}>
              Open Director&apos;s email draft
            </Link>
          </div>
        )}

        <div className={cardShell}>
          <h2 className="font-serif text-[18px] font-medium text-ink">
            {report.rows.length} {report.rows.length === 1 ? "position" : "positions"}
          </h2>
          {report.rows.length === 0 ? (
            <p className="mt-2 text-[13.5px] text-ink-soft">
              No position was open in this week, so there is nothing to send.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-edge/60">
              {clients.map((client) => (
                <div key={client} className="py-3 first:pt-0 last:pb-0">
                  <div className="text-[14px] font-medium text-ink">{client}</div>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {report.rows
                      .filter((r) => r.client === client)
                      .map((line) => (
                        <div key={line.positionId} className="text-[13px] text-ink-soft">
                          <Link
                            href={`/positions/${line.positionId}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {line.title}
                          </Link>{" "}
                          ({line.primaryTa}) — {rowInWords(line)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <FoldRow title="Plain-text email preview" summary="Exact body sent to Director">
          <div className={cardShell}>
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-[1.6] text-ink-soft">
              {reportText(report.weekOf, report.rows)}
            </pre>
          </div>
        </FoldRow>
      </div>
    </PageBox>
  );
}
