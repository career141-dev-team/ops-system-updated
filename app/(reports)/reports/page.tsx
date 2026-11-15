import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { approveWeeklyReport, buildWeeklyReportNow } from "@/app/actions";
import { desk, reportsNewestFirst, runClocks } from "@/data/desk";
import {
  PageBox,
  StatTile,
  ViewPills,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  REPORT_MEANINGS,
  type ReportState,
  problemWithReport,
  reportInWords,
  reportWeekOf,
  rowInWords,
} from "@/lib/reports";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const reports = reportsNewestFirst(db);
  const thisWeek = reports.find((r) => r.weekOf === reportWeekOf(now)) ?? null;
  const earlier = reports.filter((r) => r.id !== thisWeek?.id);
  const recipients = String(
    db.settings.find((s) => s.key === "report.recipients")?.value ?? "",
  ).trim();

  const activePositions = db.positions.filter((p) => p.stage !== "closed").length;
  const cvsSent = db.clientSets.reduce(
    (sum, s) => sum + (s.sentAt ? s.candidates.length : 0),
    0,
  );
  const interviewCount = db.interviews.filter((i) => i.state !== "cancelled").length;
  const placementCount = db.placements.length;

  const canRead = can(me, "report.read");
  const reportProblem = thisWeek ? problemWithReport(thisWeek.rows) : null;

  const tabs = [
    { key: "weekly", label: "Weekly TA report", href: "/reports" },
    { key: "operations", label: "Operations", href: "/numbers" },
    { key: "response", label: "Client response", href: "/numbers?view=response" },
    { key: "finance", label: "Finance & guarantees", href: "/numbers?view=finance" },
  ];

  const needWordRows = thisWeek
    ? thisWeek.rows.slice(0, 6)
    : db.positions
        .filter((p) => p.stage !== "closed")
        .slice(0, 6)
        .map((p) => ({
          positionId: p.id,
          title: p.title,
          client: db.clients.find((c) => c.id === p.clientId)?.name ?? "Client",
          primaryTa: db.members.find((m) => m.id === p.primaryTaId)?.name ?? "Unassigned",
          status: p.stage,
          state: p.stage,
        }));

  const cardShell = "rounded-[24px] border border-edge bg-surface p-2";

  return (
    <PageBox width="1080">
      <div className="flex flex-col gap-6">
        <ViewPills items={tabs} active="weekly" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
              Week of {thisWeek?.weekOf ?? reportWeekOf(now)}
            </h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Built by the system Monday 08:00 · the TA lead checks it and sends it to the
              Director
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {thisWeek && (
              <Link href={`/reports/${thisWeek.id}`} className={pillSecondary}>
                Open full report
              </Link>
            )}
            {!thisWeek && canRead && (
              <form action={buildWeeklyReportNow}>
                <button type="submit" className={pillPrimary}>
                  Build this week&apos;s report
                </button>
              </form>
            )}
            {thisWeek && thisWeek.state === "review" && canRead && !reportProblem && (
              <form action={approveWeeklyReport}>
                <input type="hidden" name="reportId" value={thisWeek.id} />
                <button type="submit" className={pillPrimary}>
                  Approve &amp; send to Director
                </button>
              </form>
            )}
          </div>
        </div>

        {msg && (
          <div className="rounded-[18px] border border-brand/25 bg-bg-brand px-4 py-3 text-[13px] font-medium text-ink">
            {msg}
          </div>
        )}

        {!recipients && (
          <div className="rounded-[18px] border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink">
            Nobody is set to receive it. Put the Director&rsquo;s address in{" "}
            <Link href="/settings" className="font-medium text-brand hover:underline">
              Settings
            </Link>{" "}
            under <span className="font-medium">report.recipients</span>.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile size="lg" value={String(activePositions)} label="active positions" />
          <StatTile size="lg" value={String(cvsSent)} label="CVs sent to clients" />
          <StatTile size="lg" value={String(interviewCount)} label="interviews" />
          <StatTile size="lg" value={String(placementCount)} label="placements" />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            POSITIONS THAT NEED A WORD
          </div>
          <div className={cardShell}>
            {needWordRows.length === 0 ? (
              <div className="px-4 py-6 text-[13.5px] text-ink-soft">
                No active positions to flag this week.
              </div>
            ) : (
              <div className="divide-y divide-edge/60">
                {needWordRows.map((r) => {
                  const isReportRow = "waitingOn" in r;
                  const subtitle = isReportRow
                    ? rowInWords(r as Parameters<typeof rowInWords>[0])
                    : `Primary TA: ${(r as { primaryTa: string }).primaryTa}`;
                  const badge = isReportRow
                    ? (r as { state?: string }).state ?? "Active"
                    : (r as { status: string }).status;
                  return (
                    <Link
                      key={r.positionId}
                      href={`/positions/${r.positionId}`}
                      className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                          <Icon name="briefcase" size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-medium text-ink">
                            {r.title} · {r.client}
                          </div>
                          <div className="truncate text-[12px] text-ink-soft">{subtitle}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[12.5px] font-medium text-warn">
                          {String(badge).replace(/_/g, " ")}
                        </span>
                        <Icon name="chevron-right" size={16} className="text-ink-faint" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            EARLIER WEEKS
          </div>
          <div className={cardShell}>
            {earlier.length === 0 ? (
              <div className="px-4 py-6 text-[13.5px] text-ink-soft">No earlier reports yet.</div>
            ) : (
              <div className="divide-y divide-edge/60">
                {earlier.map((rep) => (
                  <Link
                    key={rep.id}
                    href={`/reports/${rep.id}`}
                    className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-ink">
                        Week of {rep.weekOf}
                      </div>
                      <div className="text-[12px] text-ink-soft">{reportInWords(rep)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[12.5px] text-ink-soft">
                        {REPORT_MEANINGS[rep.state as ReportState] ?? rep.state}
                      </span>
                      <Icon name="chevron-right" size={16} className="text-ink-faint" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageBox>
  );
}
