import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { approveWeeklyReport } from "@/app/actions";
import Icon from "@/app/Icon";
import { Card, EmptyState, PageTitle, StatTile, StatusChip, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { desk, member as memberIn, reportIn } from "@/data/desk";
import { REPORT_MEANINGS, type ReportState, problemWithReport, reportText, rowInWords } from "@/lib/reports";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The weekly report to read and approve (v6: reached from Positions > Weekly report; nothing else links here). */
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
  const built = new Date(report.builtAt + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const clients = [...new Set(report.rows.map((r) => r.client))].sort((a, b) => a.localeCompare(b));
  const readBy = report.approvedBy ? memberIn(db, report.approvedBy)?.name : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/positions" className="t-body-m inline-flex items-center gap-2 self-start text-ink-2 hover:text-ink">
        <Icon name="chevron-left" size={16} />
        All roles
      </Link>
      <PageTitle
        title={`Weekly report, week of ${report.weekOf}`}
        sub={`Built ${built}${readBy ? ` · read by ${readBy}` : ""}`}
        right={<StatusChip tone={report.state === "sent" ? "ok" : "warn"}>{REPORT_MEANINGS[report.state as ReportState] ?? report.state}</StatusChip>}
      />

      {msg && <p className="t-small rounded-[14px] bg-bg-brand px-4 py-3 text-ink">{msg}</p>}
      {report.note && <p className="t-small rounded-[14px] bg-warn-soft px-4 py-3 text-ink">{report.note}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile value={String(report.rows.length)} label="roles covered" outline />
        <StatTile value={String(clients.length)} label="clients" outline />
        <StatTile value={report.state === "sent" ? "Sent" : "In review"} label="Director email" outline />
      </div>

      {report.state === "review" && can(me, "report.read") && (
        <Card title="Read, then approve" sub="Approving drafts the Director's email. If a line is wrong, fix it on the role or the set, then build the report again.">
          {problem ? (
            <p className="t-body-m text-warn">{problem}</p>
          ) : (
            <form action={approveWeeklyReport}>
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit" className={pillPrimary}>
                Approve, and draft the Director&apos;s email
              </button>
            </form>
          )}
        </Card>
      )}

      {report.messageId && (
        <div>
          <Link href={`/messages/${report.messageId}`} className={pillSecondary}>
            Open the Director&apos;s email draft
          </Link>
        </div>
      )}

      <Card title={`${report.rows.length} ${report.rows.length === 1 ? "role" : "roles"}`}>
        {report.rows.length === 0 ? (
          <EmptyState icon="check" title="Nothing to send">No role was open that week.</EmptyState>
        ) : (
          <div className="flex flex-col">
            {clients.map((client) => (
              <div key={client} className="flex flex-col gap-2 border-t border-rule py-4 first:border-t-0 first:pt-0">
                <h3 className="t-body-m">{client}</h3>
                {report.rows
                  .filter((r) => r.client === client)
                  .map((line) => (
                    <p key={line.positionId} className="t-small text-ink-2">
                      <Link href={`/positions/${line.positionId}?view=overview`} className="t-small font-medium text-ink underline">
                        {line.title}
                      </Link>{" "}
                      ({line.primaryTa}): {rowInWords(line)}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="The email, as it will read" sub="The exact text for the Director">
        <pre className="t-small whitespace-pre-wrap rounded-[14px] bg-sunk p-4 font-sans text-ink-2">{reportText(report.weekOf, report.rows)}</pre>
      </Card>
    </div>
  );
}
