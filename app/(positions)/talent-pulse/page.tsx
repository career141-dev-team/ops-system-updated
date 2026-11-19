import Link from "next/link";
import { redirect } from "next/navigation";

import { compileTalentPulseNow, markTalentPulsePosted, saveTalentPulseLine } from "@/app/actions";
import { BackBar, Card, PageTitle, StatusChip, figmaField, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { desk, issuesNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { ISSUE_MEANINGS, type IssueState, issueInWords, problemWithIssue, weekOf } from "@/lib/adverts";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export default async function TalentPulsePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const issues = issuesNewestFirst(db);
  const thisWeek = issues.find((i) => i.weekOf === weekOf(now)) ?? null;
  const earlier = issues.filter((i) => i.id !== thisWeek?.id);
  const mayManage = can(me, "advert.manage");
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="flex flex-col gap-[22px]">
      <BackBar href="/positions" label="Openings" />

      {msg && (
        <div className="rounded-[18px] bg-sunk px-4 py-3 t-small">
          {msg}
        </div>
      )}

      <PageTitle title="Talent Pulse" sub="Weekly newsletter · compiled Tuesday, posted Wednesday by marketing" />

      {!thisWeek && (
        <Card title={`This week (${weekOf(now)})`}>
          <p className="text-[14px] text-ink-soft">
            Nothing compiled for the week of {weekOf(now)} yet. It happens by itself on Tuesday morning; you can also
            compile it now.
          </p>
          {mayManage && (
            <form action={compileTalentPulseNow}>
              <button type="submit" className={pillPrimary}>
                Compile this week’s issue
              </button>
            </form>
          )}
        </Card>
      )}

      {thisWeek && (
        <Card
          title={`Week of ${thisWeek.weekOf}`}
          sub="This Tuesday’s list"
          right={<StatusChip label={issueInWords(thisWeek)} tone={thisWeek.state === "posted" ? "ok" : "warn"} />}
        >

          {thisWeek.lines.length === 0 && (
            <p className="text-[14px] text-ink-soft">
              No position is being searched this week, so there is nothing to put in the newsletter.
            </p>
          )}

          <div className="flex flex-col divide-y divide-rule">
            {thisWeek.lines.map((line) => (
              <div key={line.positionId} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <Link href={`/positions/${line.positionId}`} className="text-[16px] font-medium text-brand hover:underline">
                    {line.title}
                  </Link>
                  <span className="text-[14px] text-ink-soft">{line.client}</span>
                  {line.openingTaId && <span className="text-[12px] text-ink-faint">{line.openingTaId}</span>}
                </div>
                {thisWeek.state === "posted" ? (
                  <p className="mt-1 text-[14px] text-ink-soft">
                    {line.note}
                    {line.applyAddress ? ` · applications to ${line.applyAddress}` : ""}
                  </p>
                ) : (
                  mayManage && (
                    <form action={saveTalentPulseLine} className="mt-3 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="issueId" value={thisWeek.id} />
                      <input type="hidden" name="positionId" value={line.positionId} />
                      <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
                        The TA’s line about this role
                        <input name="note" defaultValue={line.note} className={figmaField} />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                        Apply address for it
                        <input
                          name="applyAddress"
                          defaultValue={line.applyAddress}
                          placeholder="given by the TA System"
                          className={figmaField}
                        />
                      </label>
                      <button type="submit" className={pillSecondary}>
                        Save
                      </button>
                    </form>
                  )
                )}
              </div>
            ))}
          </div>

          {thisWeek.state !== "posted" && thisWeek.lines.length > 0 && mayManage && (
            <form action={markTalentPulsePosted} className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
              <input type="hidden" name="issueId" value={thisWeek.id} />
              <button type="submit" className={pillPrimary}>
                Marketing has posted it
              </button>
              {problemWithIssue(thisWeek.lines) && (
                <span className="text-[12.5px] text-ink-faint">{problemWithIssue(thisWeek.lines)}</span>
              )}
            </form>
          )}

          {thisWeek.state === "posted" && (
            <p className="border-t border-rule pt-3 text-[13px] text-ink-soft">
              Posted {thisWeek.postedAt ? whenLocal(thisWeek.postedAt) : ""}
              {thisWeek.postedBy ? ` by ${memberIn(db, thisWeek.postedBy)?.name ?? "somebody"}` : ""}.
            </p>
          )}
        </Card>
      )}

      {earlier.length > 0 && (
        <Card title="Earlier weeks">
          <div className="flex flex-col divide-y divide-rule">
            {earlier.map((issue) => (
              <div key={issue.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-[14px] font-medium text-ink">Week of {issue.weekOf}</span>
                <span className="text-[13px] text-ink-soft">
                  {ISSUE_MEANINGS[issue.state as IssueState] ?? issue.state}
                </span>
                <span className="text-[12px] text-ink-faint">
                  {issue.lines.length} {issue.lines.length === 1 ? "position" : "positions"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
