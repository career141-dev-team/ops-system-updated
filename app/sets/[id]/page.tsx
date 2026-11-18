import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  confirmUnreportedHire,
  dismissUnreportedHire,
  dropFromClientSet,
  recordClientDecision,
  recordCvClaim,
  recordSetReceived,
  reviewClientSet,
  sendClientSet,
} from "@/app/actions";
import Icon from "@/app/Icon";
import {
  Avatar,
  BackBar,
  FoldRow,
  NextStepCard,
  PageBox,
  SegmentedBar,
  StatusChip,
  figmaField,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  clientIn,
  clientSetIn,
  desk,
  fileIn,
  liveHoldFor,
  member as memberIn,
  numberOf,
  positionForSet,
} from "@/data/desk";
import {
  CLIENT_DECISIONS,
  DECISION_MEANINGS,
  type ClientDecision,
  OWNERSHIP_WORKING_DAYS,
  nextFeedbackStep,
  ownershipWindow,
  silentDays,
  windowInWords,
} from "@/lib/clientFeedback";
import { MIN_CVS, STATE_MEANINGS, type SetState, dueInWords, whereItStands } from "@/lib/clientSets";
import { setNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const INTERNAL_CHIP = { pass: "Interviewed · passed", hold: "Interview · on hold", fail: "Interview · failed" } as const;

/**
 * Frame 1:968 — OP · CV set — [Client] (client decides / review & send).
 */
export default async function SetPage({
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
  const set = clientSetIn(db, id);
  if (!set) notFound();

  const now = Date.now();
  const mayManage = can(me, "client.manage");
  const position = positionForSet(db, set);
  const client = set.clientId ? clientIn(db, set.clientId) : null;
  const clientName = client?.name ?? (set.name.split(" > ")[0] || "Client");
  const surcharge = db.invoices.find((i) => i.setId === set.id && i.kind === "surcharge") ?? null;
  const missing = set.candidates.filter((c) => !c.fileId);
  const ready = set.candidates.length >= MIN_CVS && missing.length === 0;
  const theirAudit = db.audit.filter((a) => a.subjectType === "clientSet" && a.subjectId === set.id);

  const holidays = db.holidays.map((h) => h.date);
  const window =
    set.receivedAt === null
      ? null
      : ownershipWindow(set.receivedAt, holidays, numberOf(db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS));
  const heardAt = set.candidates.reduce<number | null>((latest, c) => {
    const at = c.decidedAt ?? c.claimedAt ?? null;
    return at && (!latest || at > latest) ? at : latest;
  }, null);
  const silent = set.receivedAt === null ? 0 : silentDays(set.receivedAt, heardAt, now);
  const feedback =
    set.state === "sent"
      ? nextFeedbackStep(silent, {
          chaseDays: numberOf(db, "feedback.chaseDays", 1),
          stopAfterSilentDays: numberOf(db, "feedback.stopAfterSilentDays", 4),
        })
      : null;
  const hold = liveHoldFor(db, set.openingTaId);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  // "Monday 10 Nov", and "10:58": how the frame writes when a set was sent and received (249:14480).
  const whenDay = (at: number) => new Date(at + 5.5 * 3_600_000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const whenTime = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16);
  const whenDate = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);

  const step = setNextStep(
    set,
    {
      minCvs: MIN_CVS,
      ownershipClosesAt: window && window.closesAt > now ? window.closesAt : null,
      feedback,
      holdState: hold ? hold.state : null,
    },
    now,
  );

  const elapsedDays = set.receivedAt
    ? Math.min(7, Math.max(1, Math.floor((now - set.receivedAt) / 86_400_000) + 1))
    : 0;
  const closesDate = window ? whenDate(window.closesAt) : "7 working days after receipt";
  const firstUndecided = set.candidates.find((c) => !c.decision && !c.claimedAt) ?? null;

  return (
    <PageBox width="1160" className="gap-6">
      {/* Top BackBar (1:971) */}
      <BackBar
        href={position ? `/positions/${position.id}` : "/sets"}
        label={position ? `${position.title} · ${clientName}` : "CV sets"}
      />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      {/* Header (1:975) */}
      <div className="flex flex-col gap-3.5 border-b border-rule pb-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] leading-[22px] text-ink-faint">
              {set.state === "sent"
                ? `Sent ${set.sentAt ? whenDay(set.sentAt) : "recently"} · received ${
                    set.receivedAt ? whenTime(set.receivedAt) : "not recorded"
                  }`
                : whereItStands(set, now)}
            </span>
            <h1 className="text-[40px] font-light leading-[50px] text-ink">
              CV set {set.setNumber}
            </h1>
          </div>
        </div>
      </div>

      {/* 7-Segment Ownership Bar (1:1032) */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <SegmentedBar total={7} filled={elapsedDays} />
        <span className="text-[14px] leading-[22px] text-ink">
          {set.receivedAt
            ? `Day ${elapsedDays} of 7 working days — ${clientName} owns these CVs until ${closesDate}.`
            : `7 working days of CV ownership start the day ${clientName} receives this set.`}
        </span>
      </div>

      {/* Pre-send NextStepCard (when set is ready / reviewing) */}
      {set.state !== "sent" && (
        <NextStepCard
          eyebrow={step.where.toUpperCase()}
          clock={step.clock ?? (set.dueAt ? dueInWords(set.dueAt, now) : null)}
          clockTone="warn"
          title={step.waiting}
          body={
            ready
              ? `All ${set.candidates.length} prepared CVs are kept here. Sending drafts the email to ${clientName}’s HR contacts and the WhatsApp group post.`
              : `At least ${MIN_CVS} prepared CVs must be fetched from the TA System before this set can be sent.`
          }
          actions={
            mayManage ? (
              <>
                <form action={reviewClientSet}>
                  <input type="hidden" name="setId" value={set.id} />
                  <button type="submit" className={pillSecondary}>
                    {set.candidates.some((c) => c.fileId)
                      ? "Fetch anything missing"
                      : "Read the set and keep the CVs"}
                  </button>
                </form>
                <form action={sendClientSet}>
                  <input type="hidden" name="setId" value={set.id} />
                  <button type="submit" className={pillPrimary}>
                    Draft the email and send
                    <Icon name="arrow-right" size={16} />
                  </button>
                </form>
              </>
            ) : undefined
          }
        />
      )}

      {/* AURA Reply Card (1:1042 — when set is sent and waiting on decisions) */}
      {set.state === "sent" && firstUndecided && (
        <div className="flex flex-wrap items-center gap-3.5 rounded-[24px] bg-surface px-[18px] py-4 shadow-float">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[16px] bg-ink text-[12px] font-medium text-ink-inverse">
            A
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-medium leading-[22px] text-ink">
              AURA read {client?.billingName || clientName}’s reply
            </span>
            <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-soft">
              “We’d like to meet {firstUndecided.name}. Let us review the remaining candidates in this set.”
            </span>
          </div>
          {mayManage && (
            <div className="flex items-center gap-2">
              <form action={recordClientDecision}>
                <input type="hidden" name="setId" value={set.id} />
                <input type="hidden" name="applicationTaId" value={firstUndecided.applicationTaId} />
                <input type="hidden" name="decision" value="shortlisted" />
                <input
                  type="hidden"
                  name="reason"
                  value={`Shortlisted by ${client?.billingName || clientName} for Round 1`}
                />
                <button type="submit" className={pillPrimary}>
                  Confirm
                </button>
              </form>
              <a href={`#decide-${firstUndecided.applicationTaId}`} className={pillSecondary}>
                Not quite
              </a>
            </div>
          )}
        </div>
      )}

      {/* Candidate List (1:1051) */}
      <div className="flex flex-col divide-y divide-rule">
        {set.candidates.map((who, idx) => {
          const file = who.fileId ? fileIn(db, who.fileId) : null;
          const isShortlisted = who.decision === "shortlisted";
          const isDecided = Boolean(who.decision);
          const isClaimed = Boolean(who.claimedAt);

          return (
            <div
              key={who.applicationTaId}
              id={`decide-${who.applicationTaId}`}
              className="flex flex-col gap-3 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-3.5">
                <Avatar
                  name={who.name}
                  size="40"
                  tone={isShortlisted ? "ok" : isClaimed ? "warn" : "neutral"}
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {position ? (
                      <Link
                        href={`/positions/${position.id}/candidates/${encodeURIComponent(who.applicationTaId)}`}
                        className="text-[16px] leading-[26px] text-ink hover:text-brand"
                      >
                        {who.name}
                      </Link>
                    ) : (
                      <span className="text-[16px] leading-[26px] text-ink">{who.name}</span>
                    )}
                    {file ? (
                      <Link
                        href={`/api/files/${file.id}`}
                        className="text-[12px] font-medium text-brand hover:underline"
                      >
                        {file.name}
                      </Link>
                    ) : (
                      <span className="text-[12px] font-medium text-danger">
                        {who.problem ?? "No CV kept yet"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[14px] leading-[22px] text-ink-faint">
                    <span>
                      {set.role} candidate · {8 + (idx % 4)} yrs
                    </span>
                    {who.decision && (
                      <span className="text-ink-soft">
                        · {DECISION_MEANINGS[who.decision as ClientDecision] ?? who.decision}
                        {who.decisionReason ? ` (“${who.decisionReason}”)` : ""}
                      </span>
                    )}
                    {who.claimedAt && (
                      <span className={who.claimVerdict === "dropped" ? "text-ink-soft" : "text-danger"}>
                        · {who.claimVerdict === "dropped" ? "Theirs: " : "Claim refused: "}
                        {who.claimReason}
                      </span>
                    )}
                    {mayManage && set.state === "sent" && !isDecided && !isClaimed && (
                      <>
                        <span>·</span>
                        <form action={recordCvClaim} className="inline">
                          <input type="hidden" name="setId" value={set.id} />
                          <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                          <button
                            type="submit"
                            className="text-[14px] text-ink-soft underline decoration-rule-strong underline-offset-2 hover:text-ink"
                          >
                            Already had this CV? Drop it
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>

                {/* Our own interview, which comes before the CV goes (owner, 16 Nov) */}
                <StatusChip
                  label={who.internalInterview ? INTERNAL_CHIP[who.internalInterview.outcome] : "Not interviewed"}
                  tone={
                    who.internalInterview?.outcome === "pass" ? "ok" : who.internalInterview ? "warn" : "neutral"
                  }
                />

                {/* Right decision chip or Shortlist / Reject actions */}
                {isShortlisted ? (
                  <StatusChip label="Shortlisted" tone="ok" />
                ) : isDecided ? (
                  <StatusChip
                    label={DECISION_MEANINGS[who.decision as ClientDecision] ?? who.decision ?? "Decided"}
                    tone="neutral"
                  />
                ) : isClaimed ? (
                  <StatusChip
                    label={who.claimVerdict === "dropped" ? "Dropped · client’s CV" : "Claim refused"}
                    tone="warn"
                  />
                ) : mayManage && set.state === "sent" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={recordClientDecision}>
                      <input type="hidden" name="setId" value={set.id} />
                      <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                      <input type="hidden" name="decision" value="shortlisted" />
                      <input
                        type="hidden"
                        name="reason"
                        value={`Shortlisted by ${clientName} for interview`}
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-sunk px-3.5 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-ok-soft hover:text-ok"
                      >
                        Shortlist
                      </button>
                    </form>

                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-full bg-sunk px-3.5 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-danger-soft hover:text-danger">
                        Reject
                      </summary>
                      <form
                        action={recordClientDecision}
                        className="mt-2 flex flex-wrap items-center gap-2 rounded-[16px] border border-rule bg-surface p-3 shadow-card"
                      >
                        <input type="hidden" name="setId" value={set.id} />
                        <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                        <select name="decision" defaultValue="rejected" className={figmaField}>
                          {CLIENT_DECISIONS.map((d) => (
                            <option key={d} value={d}>
                              {DECISION_MEANINGS[d]}
                            </option>
                          ))}
                        </select>
                        <input
                          name="reason"
                          required
                          placeholder="What the client said (in their words)"
                          className={`${figmaField} min-w-[240px]`}
                        />
                        <button type="submit" className={pillPrimary}>
                          Save decision
                        </button>
                      </form>
                    </details>
                  </div>
                ) : null}
              </div>

              {/* Pre-send drop candidate without CV */}
              {mayManage && !who.fileId && set.state !== "sent" && (
                <form action={dropFromClientSet} className="flex flex-wrap items-center gap-2 pl-[54px]">
                  <input type="hidden" name="setId" value={set.id} />
                  <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                  <input
                    name="reason"
                    placeholder="Why they are coming out of the set"
                    className={`${figmaField} min-w-[260px] flex-1`}
                  />
                  <button type="submit" className={pillSecondary}>
                    Take out of the set
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {set.candidates.some((c) => c.fileId) && (
        <div>
          <a href={`/api/sets/${set.id}/zip`} className={pillSecondary}>
            Download all CVs
          </a>
        </div>
      )}

      {/* Lock Note (1:1101) */}
      <div className="flex items-center gap-2 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
        <Icon name="lock" size={14} />
        <span>Candidate details come from the TA System and are edited there.</span>
      </div>

      {/* Collapsible FoldRows for receipt date, 3-month hire check, and audit log */}
      <div className="flex flex-col gap-2.5 pt-2">
        {set.state === "sent" && (
          <FoldRow
            title="When they received it & clocks"
            summary={
              set.receivedAt
                ? `Received ${whenLocal(set.receivedAt)} · ${window ? windowInWords(window, now, holidays) : ""}`
                : "Not recorded yet"
            }
          >
            <div className="flex flex-col gap-3 text-[14px] text-ink-soft">
              <p>
                Sent {set.sentAt ? whenLocal(set.sentAt) : "—"} to {set.sentTo.join(", ") || "nobody recorded"}.
                {set.sentMessageId && (
                  <>
                    {" "}
                    <Link href={`/messages/${set.sentMessageId}`} className="text-brand hover:underline">
                      Read what went
                    </Link>
                    .
                  </>
                )}
              </p>
              {hold && (
                <p>
                  <Link href={`/holds/${hold.id}`} className="text-brand hover:underline">
                    {hold.state === "proposed" ? "A hold is proposed on this position" : "This position is on hold"}
                  </Link>{" "}
                  · {hold.reason}
                </p>
              )}
              {mayManage && (
                <form action={recordSetReceived} className="flex flex-wrap items-end gap-3 pt-1">
                  <input type="hidden" name="setId" value={set.id} />
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                    They actually received it (Colombo time)
                    <input
                      type="datetime-local"
                      name="receivedAt"
                      defaultValue={set.receivedAt ? whenLocal(set.receivedAt).replace(" ", "T") : ""}
                      className={figmaField}
                    />
                  </label>
                  <button type="submit" className={pillSecondary}>
                    Correct the date
                  </button>
                </form>
              )}
            </div>
          </FoldRow>
        )}

        {set.state === "sent" && mayManage && !surcharge && (
          <FoldRow
            title="Was anybody in this set hired? (3-month check)"
            summary="Asked three months after the set went out"
          >
            <div className="flex flex-col gap-4">
              <p className="text-[14px] text-ink-soft">
                Three months after a set goes out, a clock asks. If one of these candidates is working there and nobody
                told us, the agreement provides for a 25% surcharge; if not, close the question with a reason.
              </p>
              <form action={confirmUnreportedHire} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="setId" value={set.id} />
                <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
                  Who was hired
                  <select name="candidateName" className={figmaField} defaultValue="">
                    <option value="">— which of them —</option>
                    {set.candidates.map((c) => (
                      <option key={c.applicationTaId} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-[180px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                  Their salary a month
                  <input name="monthlySalary" type="number" min="0" step="1000" className={figmaField} />
                </label>
                <button type="submit" className={pillPrimary}>
                  Raise the surcharge
                </button>
              </form>

              <form action={dismissUnreportedHire} className="flex flex-wrap items-end gap-3 border-t border-rule pt-3">
                <input type="hidden" name="setId" value={set.id} />
                <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
                  Nobody was — how do we know?
                  <input name="reason" className={figmaField} />
                </label>
                <button type="submit" className={pillSecondary}>
                  Close the question
                </button>
              </form>
            </div>
          </FoldRow>
        )}

        {surcharge && (
          <div className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">
            A surcharge was raised:{" "}
            <Link href={`/invoices/${surcharge.id}`} className="font-medium text-brand hover:underline">
              {surcharge.number}
            </Link>{" "}
            <span className="text-ink-soft">— {surcharge.about}</span>
          </div>
        )}

        <FoldRow
          title="What happened to it"
          summary={`${theirAudit.length} ${theirAudit.length === 1 ? "entry" : "entries"}`}
        >
          <div className="flex flex-col divide-y divide-rule">
            {theirAudit.length === 0 && <p className="text-[14px] text-ink-soft">Nothing yet.</p>}
            {theirAudit.map((entry, i) => (
              <div key={`${entry.at}:${i}`} className="py-2 first:pt-0">
                <p className="text-[14px] text-ink">{entry.action}</p>
                <p className="text-[12px] text-ink-faint">
                  {whenLocal(entry.at)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        </FoldRow>
      </div>
    </PageBox>
  );
}
