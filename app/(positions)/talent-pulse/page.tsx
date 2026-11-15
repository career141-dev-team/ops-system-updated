import Link from "next/link";
import { redirect } from "next/navigation";

import { compileTalentPulseNow, markTalentPulsePosted, saveTalentPulseLine } from "@/app/actions";
import { BackBar, PageBox, StatusChip, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
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
    <PageBox width="1080" className="gap-6">
      <BackBar href="/positions" label="Openings" />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-1 border-b border-rule pb-[18px]">
        <span className="text-[14px] leading-[22px] text-ink-faint">
          Weekly newsletter · compiled Tuesday, posted Wednesday by marketing
        </span>
        <h1 className="text-[40px] font-light leading-[50px] text-ink">Talent Pulse</h1>
      </div>

      {!thisWeek && (
        <div className="flex flex-col gap-3 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <h2 className="text-[18px] font-medium text-ink">This week ({weekOf(now)})</h2>
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
        </div>
      )}

      {thisWeek && (
        <div className="flex flex-col gap-4 rounded-[28px] bg-surface px-[30px] py-[26px] shadow-float">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={figmaLabel}>THIS TUESDAY’S LIST</p>
              <h2 className="mt-1 text-[20px] font-medium text-ink">Week of {thisWeek.weekOf}</h2>
            </div>
            <StatusChip
              label={issueInWords(thisWeek)}
              tone={thisWeek.state === "posted" ? "ok" : "warn"}
            />
          </div>

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
        </div>
      )}

      {earlier.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className={figmaLabel}>EARLIER WEEKS</p>
          <div className="flex flex-col divide-y divide-rule rounded-[20px] bg-sunk px-5 py-2">
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
        </div>
      )}
    </PageBox>
  );
}
