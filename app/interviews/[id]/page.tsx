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
import Icon from "@/app/Icon";
import {
  BackBar,
  FoldRow,
  JourneyBar,
  NextStepCard,
  PageBox,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  clientIn,
  desk,
  interviewIn,
  leadIn,
  member as memberIn,
  positionIn,
  referenceForApplication,
} from "@/data/desk";
import {
  FORMAT_MEANINGS,
  MAX_SLOT_LOOPS,
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
import { interviewNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function colomboDate(at: number): Date {
  return new Date(at + 5.5 * 3_600_000);
}

function formatSlotDay(at: number): string {
  const d = colomboDate(at);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function formatSlotTime(at: number): string {
  const d = colomboDate(at);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatSubtitleWhen(at: number, now: number): string {
  const d = colomboDate(at);
  const n = colomboDate(now);
  const sameDay =
    d.getUTCFullYear() === n.getUTCFullYear() &&
    d.getUTCMonth() === n.getUTCMonth() &&
    d.getUTCDate() === n.getUTCDate();
  const time = formatSlotTime(at);
  if (sameDay) return `held today ${time}`;
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${time}`;
}

/**
 * Frames `1:1187` (IV · Interview — pick a time) &
 * `1:2148` (IV · Interview — feedback to the client).
 * One interview: everything about it on one page, edited in place.
 */
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
  const client = interview.clientId ? clientIn(db, interview.clientId) : null;
  const lead = client?.leadId ? leadIn(db, client.leadId) : null;
  const owner = memberIn(db, interview.ownerId);
  const reference = referenceForApplication(db, interview.applicationTaId);
  const theirAudit = db.audit.filter((a) => a.subjectType === "interview" && a.subjectId === id).slice(0, 12);
  const mayManage = can(me, "client.manage");

  const whenLocal = (at: number) => colomboDate(at).toISOString().slice(0, 16).replace("T", " ");
  const standing = interview.at ? noticeStanding(interview.at, now) : null;
  const step = interviewNextStep(interview, { maxSlotLoops: MAX_SLOT_LOOPS, reference }, now);

  const firstName = interview.candidateName.split(" ")[0] || interview.candidateName;
  const clientName = client?.name ?? "Client";
  const contactFirstName =
    lead?.contactName?.split(" ")[0] ||
    client?.billingName?.split(" ")[0] ||
    interview.interviewers[0]?.split("@")[0] ||
    clientName;

  // Build the 3-column slot comparison cards (Frame 1:1260) when picking or booking a time
  const offeredSlots =
    interview.slots.length > 0
      ? interview.slots
      : interview.at
        ? [interview.at]
        : [];
  const chosenSlot = interview.at ?? offeredSlots[0] ?? null;

  // Subtitle matches Frame 1:1187 / 1:2148: "Senior Java Engineer · Acme Holdings · round 1"
  const subtitleParts = [
    position?.title ?? `Opening ${interview.openingTaId}`,
    clientName,
    `round ${interview.round}`,
  ];
  if (interview.at) {
    subtitleParts.push(formatSubtitleWhen(interview.at, now));
  }

  return (
    <PageBox width="1080" className="gap-6">
      <BackBar
        href="/interviews"
        label="Interviews"
        ownerName={owner?.name ?? "Unassigned"}
      />

      {/* Header (1:1214 / 1:2175) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[14px] leading-[21px] text-ink-faint">
          {position ? (
            <Link href={"/positions/" + position.id} className="hover:text-ink hover:underline">
              {position.title}
            </Link>
          ) : (
            <span>Opening {interview.openingTaId}</span>
          )}
          <span>·</span>
          {client ? (
            <Link href={"/clients/" + client.id} className="hover:text-ink hover:underline">
              {client.name}
            </Link>
          ) : (
            <span>{clientName}</span>
          )}
          <span>·</span>
          <span>round {interview.round}</span>
          {interview.at && (
            <>
              <span>·</span>
              <span>{formatSubtitleWhen(interview.at, now)}</span>
            </>
          )}
        </div>
        <h1 className="text-[32px] font-light leading-[40px] text-ink md:text-[40px] md:leading-[50px]">
          {interview.candidateName}
        </h1>
      </div>

      {/* 8-step JourneyBar (1:1217 / 1:2178) */}
      <JourneyBar active="Interviews" />

      {msg && (
        <p className="rounded-[20px] bg-bg-brand px-5 py-3 text-[14px] font-medium text-brand-ink">
          {msg}
        </p>
      )}

      {/* Up Next card — Frame 1:1187 (Slots / Agreed) vs Frame 1:2148 (Attended / Feedback) vs Booked */}
      {(interview.state === "slots" || interview.state === "agreed") && (
        <NextStepCard
          eyebrow={`UP NEXT · ${interview.scheduler === "us" ? "WE SCHEDULE" : "CLIENT SCHEDULES"}`}
          clock={step.clock ?? "Today"}
          clockTone="warn"
          title={
            interview.state === "agreed"
              ? "Book the agreed time and send the invite"
              : "Pick a time that suits both"
          }
          body={
            offeredSlots.length > 0
              ? `The client offered ${offeredSlots.length} ${offeredSlots.length === 1 ? "time" : "times"}. ${firstName} told the TA when they are free.`
              : step.waiting
          }
          byItself="When you book, a Teams invite goes to both and a reminder goes the day before at 9:00."
        >
          {/* 3-column Slot Comparison Cards (Frame 1:1260) */}
          {offeredSlots.length > 0 && (
            <div className="grid grid-cols-1 gap-3 py-1.5 sm:grid-cols-3">
              {offeredSlots.map((slotAt, idx) => {
                const isPicked = chosenSlot === slotAt;
                const isFree = isPicked || idx === 0;
                return (
                  <div
                    key={slotAt}
                    className={
                      isPicked
                        ? "flex flex-col gap-1.5 rounded-[24px] border-2 border-brand bg-bg-brand px-[18px] py-4"
                        : "flex flex-col gap-1.5 rounded-[24px] bg-sunk px-[18px] py-4"
                    }
                  >
                    <p className="text-[14px] leading-[21px] text-ink-faint">
                      {formatSlotDay(slotAt)}
                    </p>
                    <p className="text-[18px] font-medium leading-[27px] text-ink">
                      {formatSlotTime(slotAt)}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      {isFree ? (
                        <span className="inline-flex items-center gap-1.5 text-[14px] leading-[21px] text-ok">
                          <Icon name="check" size={14} className="text-ok" />
                          {firstName} is free
                        </span>
                      ) : (
                        <span className="text-[14px] leading-[21px] text-ink-faint">
                          Alternative slot
                        </span>
                      )}
                      {mayManage && interview.state === "slots" && interview.scheduler === "us" && !isPicked && (
                        <form action={recordCandidatePick}>
                          <input type="hidden" name="interviewId" value={interview.id} />
                          <input type="hidden" name="at" value={String(slotAt)} />
                          <button className="text-[13px] font-medium text-brand hover:underline">
                            Pick
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons (Frame 1:1283) */}
          {mayManage && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {interview.state === "slots" && chosenSlot && interview.scheduler === "us" ? (
                <form action={recordCandidatePick}>
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <input type="hidden" name="at" value={String(chosenSlot)} />
                  <button className={pillPrimary}>
                    Book {formatSlotDay(chosenSlot).split(" ").slice(0, 2).join(" ")} {formatSlotTime(chosenSlot)}
                  </button>
                </form>
              ) : interview.state === "agreed" && chosenSlot ? (
                <a href="#fold-book" className={pillPrimary}>
                  Book {formatSlotDay(chosenSlot).split(" ").slice(0, 2).join(" ")} {formatSlotTime(chosenSlot)}
                </a>
              ) : (
                <a href="#fold-time" className={pillPrimary}>
                  {interview.scheduler === "us" ? "Record times" : "Record client’s date"}
                </a>
              )}

              {interview.scheduler === "us" && (
                <form action={requestInterviewSlots}>
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <input type="hidden" name="to" value={interview.interviewers.join("\n")} />
                  <button className={pillSecondary}>
                    Ask the client for more times
                  </button>
                </form>
              )}
            </div>
          )}
        </NextStepCard>
      )}

      {/* Frame 1:2148 — Attended: Send feedback to client / Record client decision */}
      {interview.state === "attended" && (
        <NextStepCard
          eyebrow={`UP NEXT · ${step.where.toUpperCase()}`}
          clock={step.clock ?? "Today"}
          clockTone="warn"
          title={
            !interview.decision
              ? `Send ${firstName}’s feedback to ${contactFirstName}`
              : step.waiting
          }
          body={
            !interview.decision
              ? "The TA logged it after 5 pm. It goes to the client on WhatsApp once you approve."
              : interviewInWords(interview, now)
          }
        >
          {/* Mint feedback preview box (Frame 1:2221) */}
          <div className="max-w-[640px] rounded-[20px] bg-bg-brand px-[18px] py-3.5 text-[16px] leading-[26px] text-ink">
            {interview.candidateFeedback ||
              `Hi ${contactFirstName} — ${firstName} enjoyed meeting you today. They are keen on the role, can start in a month, and are ready for the next step. Shall we set up round ${interview.round + 1}?`}
          </div>

          {mayManage && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {interview.inviteMessageId ? (
                <Link href={"/messages/" + interview.inviteMessageId} className={pillPrimary}>
                  Approve and send
                </Link>
              ) : (
                <a href="#fold-decision" className={pillPrimary}>
                  Approve and send
                </a>
              )}
              <a href="#fold-decision" className={pillSecondary}>
                {interview.decision ? "View client decision" : "Edit / Record decision"}
              </a>
            </div>
          )}
        </NextStepCard>
      )}

      {/* Booked / Reconfirmed / Other states */}
      {interview.state !== "slots" &&
        interview.state !== "agreed" &&
        interview.state !== "attended" && (
          <NextStepCard
            eyebrow={`UP NEXT · ${step.where.toUpperCase()}`}
            clock={step.clock ?? undefined}
            clockTone={step.clock ? "warn" : "neutral"}
            title={step.waiting}
            body={`${interviewInWords(interview, now)} · ${SCHEDULER_MEANINGS[interview.scheduler as Scheduler] ?? interview.scheduler} · candidate ${interview.applicationTaId} in the TA System.`}
          >
            {mayManage && (interview.state === "booked" || interview.state === "reconfirmed") && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <form action={markInterviewAttendance}>
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <input type="hidden" name="came" value="attended" />
                  <button className={pillPrimary}>Mark as held</button>
                </form>
                <a href="#fold-attendance" className={pillSecondary}>
                  No-show, pull-out or reschedule
                </a>
              </div>
            )}
          </NextStepCard>
        )}

      {/* Collapsible Folds (Frames 1:2227, 1:2236) */}
      <div className="flex flex-col gap-3">
        {/* Fold 1: The time (slots & picking) */}
        {(interview.state === "slots" || interview.state === "agreed") && mayManage && (
          <div id="fold-time">
            <FoldRow
              title="Fold · The time"
              summary={
                interview.slots.length
                  ? `${interview.slots.length} offered`
                  : "None offered yet"
              }
              defaultOpen={step.at === "slots"}
            >
              {interview.scheduler === "us" ? (
                <div className="flex flex-col gap-5">
                  <form action={requestInterviewSlots} className="flex flex-col gap-3">
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <label className={figmaLabel}>
                      Ask these people for times (one a line; left empty, the ones already on the interview)
                      <textarea
                        name="to"
                        rows={2}
                        defaultValue={interview.interviewers.join("\n")}
                        className={figmaField}
                      />
                    </label>
                    <button className={`${pillSecondary} self-start`}>
                      {interview.slotLoops ? "Ask again for times" : "Ask the client for times"}
                    </button>
                    {interview.slotLoops > 0 && (
                      <p className="text-[13px] text-ink-faint">
                        Asked {interview.slotLoops} {interview.slotLoops === 1 ? "time" : "times"} so far. After three
                        rounds with nothing agreed the TA is asked for a back-up instead.
                      </p>
                    )}
                  </form>

                  <form
                    action={recordInterviewSlots}
                    className="flex flex-col gap-3 border-t border-rule pt-4"
                  >
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <label className={figmaLabel}>
                      The times they offered, one a line, Colombo time
                      <textarea
                        name="slots"
                        rows={3}
                        placeholder="2026-11-13 10:30"
                        className={figmaField}
                      />
                    </label>
                    <button className={`${pillSecondary} self-start`}>Record their times</button>
                  </form>
                </div>
              ) : (
                <form action={recordClientBooking} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <label className={`min-w-[240px] ${figmaLabel}`}>
                    The date they booked
                    <input name="at" type="datetime-local" className={figmaField} />
                  </label>
                  <button className={pillPrimary}>Record the client&apos;s date</button>
                </form>
              )}

              {interview.slots.length > 0 && interview.scheduler === "us" && (
                <form
                  action={recordCandidatePick}
                  className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4"
                >
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <label className={`min-w-[240px] ${figmaLabel}`}>
                    The candidate took (the TA asks them, not us)
                    <select name="at" className={figmaField} defaultValue="">
                      <option value="">— which one —</option>
                      {interview.slots.map((at) => (
                        <option key={at} value={at}>
                          {whenLocal(at)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className={pillSecondary}>Record their pick</button>
                </form>
              )}
            </FoldRow>
          </div>
        )}

        {/* Fold 2: Book it */}
        {(interview.state === "agreed" || interview.state === "slots") && mayManage && (
          <div id="fold-book">
            <FoldRow
              title="Fold · Book it & send invite"
              summary={
                interview.at
                  ? `${whenLocal(interview.at)} · ${FORMAT_MEANINGS[interview.format as keyof typeof FORMAT_MEANINGS] ?? interview.format}`
                  : "Refuses without a link or an address, and without who is interviewing"
              }
              defaultOpen={interview.state === "agreed" || step.at === "book"}
            >
              <p className="mb-3 max-w-[70ch] text-[14px] text-ink-soft">
                {interview.at ? whenLocal(interview.at) : "Pick a slot first"}. Booking tells the TA System, drafts the
                invite to the client&rsquo;s people, and starts the day-before reminder.
              </p>
              <form action={bookInterview} className="flex flex-col gap-3">
                <input type="hidden" name="interviewId" value={interview.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={figmaLabel}>
                    How it is held
                    <select name="format" className={figmaField} defaultValue={interview.format}>
                      {Object.entries(FORMAT_MEANINGS).map(([key, what]) => (
                        <option key={key} value={key}>
                          {what}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={figmaLabel}>
                    The meeting link, or the address if at their office
                    <input
                      name="whereOrLink"
                      defaultValue={interview.whereOrLink}
                      placeholder="https://teams.microsoft.com/..."
                      className={figmaField}
                    />
                  </label>
                </div>
                <label className={figmaLabel}>
                  Who is interviewing (one address a line — they get the invite)
                  <textarea
                    name="interviewers"
                    rows={2}
                    defaultValue={interview.interviewers.join("\n")}
                    className={figmaField}
                  />
                </label>
                <p className="text-[12.5px] text-ink-faint">
                  The link is pasted in by a person for now. Making the Teams meeting from the Ops mailbox needs a
                  calendar permission the owner has yet to grant, and a made-up link is worse than an asked-for one.
                </p>
                <button className={`${pillPrimary} self-start`}>
                  Book it, and draft the invite
                </button>
              </form>
            </FoldRow>
          </div>
        )}

        {/* Fold 3: Attendance (Frame 1:2227) */}
        <div id="fold-attendance">
          <FoldRow
            title="Fold · Attendance"
            summary={
              interview.attendedAt
                ? `Held · marked ${formatSlotTime(interview.attendedAt)}`
                : interview.at
                  ? `${whenLocal(interview.at)} · ${FORMAT_MEANINGS[interview.format as keyof typeof FORMAT_MEANINGS] ?? interview.format}`
                  : STATE_MEANINGS[interview.state as InterviewState] ?? interview.state
            }
            defaultOpen={step.at === "booked"}
          >
            <p className="text-[14px] text-ink-soft">
              {interview.at ? whenLocal(interview.at) : "no time"} ·{" "}
              {FORMAT_MEANINGS[interview.format as keyof typeof FORMAT_MEANINGS] ?? interview.format} ·{" "}
              {interview.interviewers.join(", ") || "nobody named"}
            </p>
            {interview.whereOrLink && (
              <p className="mt-1 break-words text-[13px] text-ink-faint">{interview.whereOrLink}</p>
            )}

            {mayManage && (interview.state === "booked" || interview.state === "reconfirmed") && (
              <>
                <form
                  action={markInterviewAttendance}
                  className="mt-4 flex flex-col gap-3 border-t border-rule pt-4"
                >
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <div className="flex flex-wrap items-end gap-3">
                    <label className={`min-w-[180px] ${figmaLabel}`}>
                      Did it happen?
                      <select name="came" className={figmaField} defaultValue="attended">
                        <option value="attended">Yes, it was held</option>
                        <option value="no_show">No, nobody came</option>
                      </select>
                    </label>
                    <label className={`min-w-[240px] flex-1 ${figmaLabel}`}>
                      If nobody came, what happened?
                      <input name="reason" className={figmaField} />
                    </label>
                    <button className={pillPrimary}>Mark it</button>
                  </div>
                </form>

                <form
                  action={recordCandidateOut}
                  className="mt-4 flex flex-col gap-3 border-t border-rule pt-4"
                >
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <label className={figmaLabel}>
                    The candidate has pulled out — why?
                    <input name="reason" className={figmaField} />
                  </label>
                  {standing && <p className="text-[12.5px] text-ink-faint">{standing.what}</p>}
                  <button className={`${pillSecondary} self-start`}>
                    Draft the notice to the client
                  </button>
                </form>

                <form
                  action={cancelInterview}
                  className="mt-4 flex flex-col gap-3 border-t border-rule pt-4"
                >
                  <input type="hidden" name="interviewId" value={interview.id} />
                  <label className={figmaLabel}>
                    The client has cancelled or moved it — why?
                    <input name="reason" className={figmaField} />
                  </label>
                  <label className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                    <input type="checkbox" name="again" value="yes" defaultChecked /> They want it rebooked (the round
                    is kept)
                  </label>
                  <button className={`${pillSecondary} self-start`}>Record it</button>
                </form>
              </>
            )}
          </FoldRow>
        </div>

        {/* Fold 4: Client decides (Frame 1:2236) */}
        <div id="fold-decision">
          <FoldRow
            title="Fold · Client decides"
            summary={
              interview.decision
                ? ROUND_DECISIONS[interview.decision] ?? interview.decision
                : `Round ${interview.round + 1} · not moving · selected`
            }
            defaultOpen={interview.state === "attended" && !interview.decision}
          >
            {interview.decision ? (
              <p className="text-[14px] text-ink">
                {ROUND_DECISIONS[interview.decision] ?? interview.decision}
                {interview.decisionReason && (
                  <span className="text-ink-soft"> — {interview.decisionReason}</span>
                )}
              </p>
            ) : mayManage && interview.state === "attended" ? (
              <form action={recordRoundDecision} className="flex flex-col gap-3">
                <input type="hidden" name="interviewId" value={interview.id} />
                <label className={figmaLabel}>
                  Their decision
                  <select name="decision" className={figmaField} defaultValue="">
                    <option value="">— what did they say —</option>
                    {Object.entries(ROUND_DECISIONS).map(([key, what]) => (
                      <option key={key} value={key}>
                        {what}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={figmaLabel}>
                  In their own words (required for a rejection — the TA has to tell the candidate something true)
                  <textarea name="reason" rows={2} className={figmaField} />
                </label>
                <button className={`${pillPrimary} self-start`}>Record it</button>
              </form>
            ) : (
              <p className="text-[14px] text-ink-soft">
                Once the interview is marked as held, record the client&rsquo;s decision here.
              </p>
            )}
          </FoldRow>
        </div>

        {/* Fold 5: Reference check (when selected or reference exists) */}
        {(interview.decision === "selected" || reference) && mayManage && (
          <FoldRow
            title="Fold · A reference check"
            summary={
              reference
                ? REFERENCE_MEANINGS[reference.state as ReferenceState] ?? reference.state
                : "Only when the client asks for one"
            }
            defaultOpen={step.at === "reference"}
          >
            {!reference ? (
              <form action={requestReference} className="flex flex-col gap-3">
                <input type="hidden" name="interviewId" value={interview.id} />
                <p className="max-w-[70ch] text-[14px] text-ink-soft">
                  Only when the client asks. The TA phones the referee directly — no form and no score out of ten — and
                  writes down what was said; we pass it on as it is.
                </p>
                <label className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                  <input type="checkbox" name="clientAsked" value="yes" /> The client asked for one
                </label>
                <button className={`${pillSecondary} self-start`}>Ask the TA for it</button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[14px] font-medium text-ink">
                  {REFERENCE_MEANINGS[reference.state as ReferenceState] ?? reference.state}
                </p>
                {reference.report && (
                  <p className="whitespace-pre-wrap rounded-[16px] bg-surface p-3.5 text-[14px] text-ink-soft">
                    {reference.report}
                  </p>
                )}

                {reference.state === "requested" && (
                  <form action={recordReferenceReport} className="flex flex-col gap-3">
                    <input type="hidden" name="referenceId" value={reference.id} />
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <label className={figmaLabel}>
                      What the referee said, as it was said
                      <textarea name="report" rows={4} className={figmaField} />
                    </label>
                    <button className={`${pillPrimary} self-start`}>Write it down</button>
                  </form>
                )}

                {reference.state === "reported" && (
                  <form action={relayReference} className="flex flex-col">
                    <input type="hidden" name="referenceId" value={reference.id} />
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <button className={`${pillPrimary} self-start`}>
                      Draft it for the client, word for word
                    </button>
                  </form>
                )}

                {reference.state === "relayed" && (
                  <form action={recordReferenceDecision} className="flex flex-col gap-3">
                    <input type="hidden" name="referenceId" value={reference.id} />
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <div className="flex flex-wrap items-end gap-3">
                      <label className={`min-w-[180px] ${figmaLabel}`}>
                        The client&rsquo;s answer
                        <select name="decision" className={figmaField} defaultValue="cleared">
                          <option value="cleared">Happy — go ahead</option>
                          <option value="dropped">Dropped them</option>
                        </select>
                      </label>
                      <label className={`min-w-[240px] flex-1 ${figmaLabel}`}>
                        If dropped, their words
                        <input name="reason" className={figmaField} />
                      </label>
                      <button className={pillPrimary}>Record it</button>
                    </div>
                  </form>
                )}

                {reference.relayMessageId && (
                  <p className="text-[13.5px]">
                    <Link href={"/messages/" + reference.relayMessageId} className="text-brand hover:underline">
                      The message to the client →
                    </Link>
                  </p>
                )}
              </div>
            )}
          </FoldRow>
        )}

        {/* Fold 6: What happened to it */}
        <FoldRow
          title="Fold · What happened to it"
          summary={theirAudit.length + (theirAudit.length === 1 ? " entry" : " entries")}
        >
          {interview.inviteMessageId && (
            <p className="mb-3 text-[13.5px]">
              <Link href={"/messages/" + interview.inviteMessageId} className="text-brand hover:underline">
                The invite to the client&rsquo;s people →
              </Link>
            </p>
          )}
          {theirAudit.length === 0 && <p className="text-[14px] text-ink-soft">Nothing yet.</p>}
          <div className="flex flex-col divide-y divide-rule">
            {theirAudit.map((entry) => (
              <div key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[13.5px] text-ink">
                  {entry.action}
                  {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
                </p>
                <p className="text-[12px] text-ink-faint">
                  {whenLocal(entry.at)}
                  {entry.reason && " · " + entry.reason}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-faint">
            {STATE_MEANINGS[interview.state as InterviewState] ?? interview.state}
            {interview.reason && " · " + interview.reason}
          </p>
        </FoldRow>
      </div>
    </PageBox>
  );
}
