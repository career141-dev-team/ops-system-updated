import Link from "next/link";
import { redirect } from "next/navigation";

import { compileTalentPulseNow, markTalentPulsePosted, saveTalentPulseLine } from "@/app/actions";
import { desk, issuesNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { ISSUE_MEANINGS, type IssueState, issueInWords, problemWithIssue, weekOf } from "@/lib/adverts";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Talent Pulse (15, Phase 3 steps 14 and 15).
 *
 * The owner's rhythm: ops compiles the open positions on Tuesday with a line
 * from each TA, and marketing posts it on the Wednesday. It is compiled by a
 * clock rather than by somebody remembering, which is why it used to slip —
 * and each role carries its own apply address, so a CV that comes in through
 * the newsletter knows which role it came from.
 */
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

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">Talent Pulse</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Every open position, with one line from its TA, compiled on Tuesday and posted by marketing on Wednesday. It
          compiles itself; what it needs from people is the lines.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {!thisWeek && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">This week</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Nothing compiled for the week of {weekOf(now)} yet. It happens by itself on Tuesday morning; you can also
            do it now.
          </p>
          {mayManage && (
            <form action={compileTalentPulseNow} className="mt-3">
              <button className={plain}>Compile this week&apos;s issue</button>
            </form>
          )}
        </section>
      )}

      {thisWeek && (
        <section className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14.5px] font-medium">Week of {thisWeek.weekOf}</h2>
            <span className="text-[12.5px] text-ink-soft">{issueInWords(thisWeek)}</span>
          </div>

          {thisWeek.lines.length === 0 && (
            <p className="mt-2 text-[13px] text-ink-soft">
              No position is being searched this week, so there is nothing to put in the newsletter.
            </p>
          )}

          {thisWeek.lines.map((line) => (
            <div key={line.positionId} className="border-t border-rule py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={"/positions/" + line.positionId} className="text-[13.5px] text-brand hover:underline">
                  {line.title}
                </Link>
                <span className="text-[12.5px] text-ink-soft">{line.client}</span>
                {line.openingTaId && <span className="text-[12px] text-ink-faint">{line.openingTaId}</span>}
              </div>
              {thisWeek.state === "posted" ? (
                <p className="mt-1 text-[13px]">
                  {line.note}
                  {line.applyAddress ? " · applications to " + line.applyAddress : ""}
                </p>
              ) : (
                mayManage && (
                  <form action={saveTalentPulseLine} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="issueId" value={thisWeek.id} />
                    <input type="hidden" name="positionId" value={line.positionId} />
                    <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12px] text-ink-faint">
                      The TA&apos;s line about this role
                      <input name="note" defaultValue={line.note} className={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] text-ink-faint">
                      Apply address for it
                      <input
                        name="applyAddress"
                        defaultValue={line.applyAddress}
                        placeholder="given by the TA System"
                        className={field}
                      />
                    </label>
                    <button className={plain}>Save</button>
                  </form>
                )
              )}
            </div>
          ))}

          {thisWeek.state !== "posted" && thisWeek.lines.length > 0 && (
            <>
              <p className="mt-3 text-[12px] text-ink-faint">
                Each role has its own apply address so a CV from the newsletter is tagged to that role, not to nobody.
                Until the TA System gives them out, paste the address in by hand.
              </p>
              {mayManage && (
                <form action={markTalentPulsePosted} className="mt-3">
                  <input type="hidden" name="issueId" value={thisWeek.id} />
                  <button className={button}>Marketing has posted it</button>
                  {problemWithIssue(thisWeek.lines) && (
                    <p className="mt-2 text-[12.5px] text-ink-faint">{problemWithIssue(thisWeek.lines)}</p>
                  )}
                </form>
              )}
            </>
          )}

          {thisWeek.state === "posted" && (
            <p className="mt-3 text-[12.5px] text-ink-soft">
              Posted {thisWeek.postedAt ? whenLocal(thisWeek.postedAt) : ""}
              {thisWeek.postedBy ? " by " + (memberIn(db, thisWeek.postedBy)?.name ?? "somebody") : ""}.
            </p>
          )}
        </section>
      )}

      {earlier.length > 0 && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Earlier weeks</h2>
          {earlier.map((issue) => (
            <div key={issue.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-3 first:border-t-0">
              <span className="text-[13.5px]">Week of {issue.weekOf}</span>
              <span className="text-[12.5px] text-ink-soft">
                {ISSUE_MEANINGS[issue.state as IssueState] ?? issue.state}
              </span>
              <span className="ml-auto text-[12px] text-ink-faint">
                {issue.lines.length} {issue.lines.length === 1 ? "position" : "positions"}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
