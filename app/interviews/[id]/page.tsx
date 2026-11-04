import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  bookInterview,
  cancelInterview,
  markInterviewAttendance,
  recordCandidateOut,
  recordCandidatePick,
  recordClientBooking,
  recordInterviewSlots,
  recordReferenceDecision,
  recordReferenceReport,
  recordRoundDecision,
  relayReference,
  requestInterviewSlots,
  requestReference,
} from "@/app/actions";
import { desk, interviewIn, member as memberIn, positionIn, referenceForApplication } from "@/data/desk";
import {
  FORMAT_MEANINGS,
  REFERENCE_MEANINGS,
  ROUND_DECISIONS,
  SCHEDULER_MEANINGS,
  STATE_MEANINGS,
  type InterviewState,
  type ReferenceState,
  type Scheduler,
  interviewInWords,
  noticeStanding,
} from "@/lib/interviews";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One interview: everything about it on one page, edited in place. */
export default async function InterviewPage({
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

  const now = Date.now();
  const db = await desk();
  const interview = interviewIn(db, id);
  if (!interview) notFound();
  const position = interview.positionId ? positionIn(db, interview.positionId) : null;
  const reference = referenceForApplication(db, interview.applicationTaId);
  const theirAudit = db.audit.filter((a) => a.subjectType === "interview" && a.subjectId === id).slice(0, 12);
  const mayManage = can(me, "client.manage");

  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  const standing = interview.at ? noticeStanding(interview.at, now) : null;

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/interviews" className="text-[12.5px] text-brand hover:underline">
          Back to the interviews
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{interview.candidateName}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {interviewInWords(interview, now)} · {memberIn(db, interview.ownerId)?.name ?? "nobody"} owns it
          {position && (
            <>
              {" · "}
              <Link href={"/positions/" + position.id} className="text-brand hover:underline">
                {position.title}
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {SCHEDULER_MEANINGS[interview.scheduler as Scheduler] ?? interview.scheduler} · candidate{" "}
          {interview.applicationTaId} in the TA System
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {/* Agreeing a time: the two paths, ours and the client's. */}
      {(interview.state === "slots" || interview.state === "agreed") && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">The time</h2>

          {interview.scheduler === "us" ? (
            <>
              <form action={requestInterviewSlots} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="interviewId" value={interview.id} />
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  Ask these people for times (one a line; left empty, the ones already on the interview)
                  <textarea name="to" rows={2} defaultValue={interview.interviewers.join("\n")} className={field} />
                </label>
                <button className={plain}>
                  {interview.slotLoops ? "Ask again for times" : "Ask the client for times"}
                </button>
                {interview.slotLoops > 0 && (
                  <p className="text-[12px] text-ink-faint">
                    Asked {interview.slotLoops} {interview.slotLoops === 1 ? "time" : "times"} so far. After three
                    rounds with nothing agreed the TA is asked for a back-up instead.
                  </p>
                )}
              </form>

              <form action={recordInterviewSlots} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
                <input type="hidden" name="interviewId" value={interview.id} />
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  The times they offered, one a line, Colombo time
                  <textarea name="slots" rows={3} placeholder="2026-11-09 10:00" className={field} />
                </label>
                <button className={plain}>Record their times</button>
              </form>
            </>
          ) : (
            <form action={recordClientBooking} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="interviewId" value={interview.id} />
              <label className="flex min-w-[220px] flex-col gap-1 text-[12.5px] text-ink-soft">
                The date they booked
                <input name="at" type="datetime-local" className={field} />
              </label>
              <button className={plain}>Record the client&apos;s date</button>
            </form>
          )}

          {interview.slots.length > 0 && interview.scheduler === "us" && (
            <form action={recordCandidatePick} className="mt-4 flex flex-wrap items-end gap-2 border-t border-rule pt-4">
              <input type="hidden" name="interviewId" value={interview.id} />
              <label className="flex min-w-[240px] flex-col gap-1 text-[12.5px] text-ink-soft">
                The candidate took (the TA asks them, not us)
                <select name="at" className={field} defaultValue="">
                  <option value="">— which one —</option>
                  {interview.slots.map((at) => (
                    <option key={at} value={at}>
                      {whenLocal(at)}
                    </option>
                  ))}
                </select>
              </label>
              <button className={plain}>Record their pick</button>
            </form>
          )}
        </section>
      )}

      {/* A time is agreed: book it. */}
      {interview.state === "agreed" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Book it</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            {interview.at ? whenLocal(interview.at) : "no time yet"}. Booking tells the TA System, drafts the invite to
            the client&rsquo;s people, and starts the day-before reminder.
          </p>
          <form action={bookInterview} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="interviewId" value={interview.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              How it is held
              <select name="format" className={field} defaultValue={interview.format}>
                {Object.entries(FORMAT_MEANINGS).map(([key, what]) => (
                  <option key={key} value={key}>
                    {what}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              Who is interviewing (one address a line — they get the invite)
              <textarea name="interviewers" rows={2} defaultValue={interview.interviewers.join("\n")} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              The meeting link, or the address if it is at their office
              <input name="whereOrLink" defaultValue={interview.whereOrLink} className={field} />
            </label>
            <p className="text-[12px] text-ink-faint">
              The link is pasted in by a person for now. Making the Teams meeting from the Ops mailbox needs a calendar
              permission the owner has yet to grant, and a made-up link is worse than an asked-for one.
            </p>
            <button className={button}>Book it, and draft the invite</button>
          </form>
        </section>
      )}

      {/* Booked: attendance, the candidate pulling out, the client moving it. */}
      {(interview.state === "booked" || interview.state === "reconfirmed") && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Before and after it</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            {interview.at ? whenLocal(interview.at) : "no time"} ·{" "}
            {FORMAT_MEANINGS[interview.format as keyof typeof FORMAT_MEANINGS] ?? interview.format} ·{" "}
            {interview.interviewers.join(", ") || "nobody named"}
          </p>
          {interview.whereOrLink && <p className="mt-1 break-words text-[12.5px]">{interview.whereOrLink}</p>}

          <form action={markInterviewAttendance} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
            <input type="hidden" name="interviewId" value={interview.id} />
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[160px] flex-col gap-1 text-[12.5px] text-ink-soft">
                Did it happen?
                <select name="came" className={field} defaultValue="attended">
                  <option value="attended">Yes, it was held</option>
                  <option value="no_show">No, nobody came</option>
                </select>
              </label>
              <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                If nobody came, what happened?
                <input name="reason" className={field} />
              </label>
              <button className={plain}>Mark it</button>
            </div>
          </form>

          <form action={recordCandidateOut} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
            <input type="hidden" name="interviewId" value={interview.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              The candidate has pulled out — why?
              <input name="reason" className={field} />
            </label>
            {standing && <p className="text-[12px] text-ink-faint">{standing.what}</p>}
            <button className={plain}>Draft the notice to the client</button>
          </form>

          <form action={cancelInterview} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
            <input type="hidden" name="interviewId" value={interview.id} />
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              The client has cancelled or moved it — why?
              <input name="reason" className={field} />
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" name="again" value="yes" defaultChecked /> They want it rebooked (the round is
              kept)
            </label>
            <button className={plain}>Record it</button>
          </form>
        </section>
      )}

      {interview.candidateFeedback && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">What the candidate said afterwards</h2>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{interview.candidateFeedback}</p>
          <p className="mt-2 text-[12px] text-ink-faint">
            The TA phones them after five; this is their words. The message to the client is drafted for the morning.
          </p>
        </section>
      )}

      {/* Held: the client's decision. */}
      {interview.state === "attended" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">What the client decided</h2>
          {interview.decision ? (
            <p className="mt-2 text-[13px]">
              {ROUND_DECISIONS[interview.decision] ?? interview.decision}
              {interview.decisionReason && <span className="text-ink-soft"> — {interview.decisionReason}</span>}
            </p>
          ) : (
            <form action={recordRoundDecision} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="interviewId" value={interview.id} />
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Their decision
                <select name="decision" className={field} defaultValue="">
                  <option value="">— what did they say —</option>
                  {Object.entries(ROUND_DECISIONS).map(([key, what]) => (
                    <option key={key} value={key}>
                      {what}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                In their own words (required for a rejection — the TA has to tell the candidate something true)
                <textarea name="reason" rows={2} className={field} />
              </label>
              <button className={button}>Record it</button>
            </form>
          )}
        </section>
      )}

      {/* The reference, only when the client asks for one. */}
      {interview.decision === "selected" && mayManage && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">A reference check</h2>
          {!reference ? (
            <form action={requestReference} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="interviewId" value={interview.id} />
              <p className="max-w-[70ch] text-[13px] text-ink-soft">
                Only when the client asks. The TA phones the referee directly — no form and no score out of ten — and
                writes down what was said; we pass it on as it is.
              </p>
              <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                <input type="checkbox" name="clientAsked" value="yes" /> The client asked for one
              </label>
              <button className={plain}>Ask the TA for it</button>
            </form>
          ) : (
            <>
              <p className="mt-1 text-[13px]">
                {REFERENCE_MEANINGS[reference.state as ReferenceState] ?? reference.state}
              </p>
              {reference.report && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{reference.report}</p>
              )}

              {reference.state === "requested" && (
                <form action={recordReferenceReport} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="referenceId" value={reference.id} />
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    What the referee said, as it was said
                    <textarea name="report" rows={4} className={field} />
                  </label>
                  <button className={plain}>Write it down</button>
                </form>
              )}

              {reference.state === "reported" && (
                <form action={relayReference} className="mt-3 flex flex-col">
                  <input type="hidden" name="referenceId" value={reference.id} />
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <button className={plain}>Draft it for the client, word for word</button>
                </form>
              )}

              {reference.state === "relayed" && (
                <form action={recordReferenceDecision} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="referenceId" value={reference.id} />
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-[160px] flex-col gap-1 text-[12.5px] text-ink-soft">
                      The client&rsquo;s answer
                      <select name="decision" className={field} defaultValue="cleared">
                        <option value="cleared">Happy — go ahead</option>
                        <option value="dropped">Dropped them</option>
                      </select>
                    </label>
                    <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                      If dropped, their words
                      <input name="reason" className={field} />
                    </label>
                    <button className={plain}>Record it</button>
                  </div>
                </form>
              )}

              {reference.relayMessageId && (
                <p className="mt-3 text-[12.5px]">
                  <Link href={"/messages/" + reference.relayMessageId} className="text-brand hover:underline">
                    The message to the client
                  </Link>
                </p>
              )}
            </>
          )}
        </section>
      )}

      {interview.inviteMessageId && (
        <p className="text-[13px]">
          <Link href={"/messages/" + interview.inviteMessageId} className="text-brand hover:underline">
            The invite to the client&rsquo;s people
          </Link>
        </p>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry) => (
          <div key={entry.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[12.5px]">
              {entry.action}
              {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
            </p>
            <p className="text-[12px] text-ink-faint">
              {whenLocal(entry.at)}
              {entry.reason && " · " + entry.reason}
            </p>
          </div>
        ))}
        <p className="mt-2 text-[12px] text-ink-faint">
          {STATE_MEANINGS[interview.state as InterviewState] ?? interview.state}
          {interview.reason && " · " + interview.reason}
        </p>
      </section>
    </div>
  );
}
