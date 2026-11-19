import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  devLoadOpeningsSample,
  devMoveClock,
  devRemoveOpeningsSample,
  devTaCreateOpening,
  devTaInterviewEvent,
  devTaJoined,
  devTaOpening,
  devTaPlace,
  devTaPushQueue,
  devTaSendSet,
  devTaStage,
} from "@/app/actions";
import { PageTitle, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { clientIn, desk, liveTimers, outboxWaiting, positionsNewestFirst } from "@/data/desk";
import { SAMPLE_PREFIX } from "@/data/sampleOpenings";
import { fakeTa, pipeline } from "@/lib/ta";
import { currentMember, devSignInAllowed } from "@/lib/session";

/**
 * Pretend to be the TA System (17 Nov).
 *
 * Steps of the flow wait for TA to say something: that an opening exists, that
 * a set of CVs is ready, what a candidate said, that somebody was placed or
 * joined. This panel says it with invented data through the same handlers the
 * real events use, so the whole process can be walked on a laptop before the
 * real API answers. It does not exist unless the development sign-in and the
 * stand-in TA System are both on.
 */
export default async function DevTaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if (!devSignInAllowed() || !fakeTa()) notFound();
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;
  const db = await desk();
  const positions = positionsNewestFirst(db);
  const sampleIn = db.clients.some((c) => c.id.startsWith(SAMPLE_PREFIX));
  const timers = liveTimers(db);
  const waitingWrites = outboxWaiting(db).length;
  // TA's pipeline for every opening, for "TA moves a candidate" (the stand-in answers by opening since 18 Nov).
  const pipelines = new Map(
    await Promise.all(
      positions
        .filter((p) => p.openingTaId)
        .map(async (p) => {
          const answer = await pipeline(p.openingTaId as string);
          return [p.id, answer.ok ? answer.data.applications : []] as const;
        }),
    ),
  );
  const STAGES = ["screened", "sent_to_client", "client_shortlist", "interview", "offer", "rejected_by_client", "withdrawn"];
  const clockWords: Record<string, string> = {
    "set.due": "the set is due at the client",
    "set.ownership": "the client's CV ownership ends",
    "feedback.chase": "chase the client's feedback",
    "feedback.call": "call the client about feedback",
    "silence.hold": "propose a hold for silence",
    "hold.review": "review the hold",
    "hire.unreported": "the 3-month unreported-hire check",
    "ad.close": "close the TopJobs advert",
    "doj.remind.week": "a week before they join",
    "doj.remind.day": "the day before they join",
    "doj.join": "the joining-day check",
    "invoice.due": "the invoice falls due",
    "invoice.chase": "chase the unpaid invoice (adds the late charge)",
    "guarantee.warn": "the guarantee warning",
    "guarantee.end": "the guarantee ends",
    "replacement.deadline": "the replacement deadline",
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle title="Pretend to be the TA System" sub="Development only. Everything here is invented and goes through the same handlers as a real TA event. Do the Ops steps on the real screens, then press what TA would say here. It cannot run against the real TA System." />

      {msg && <div className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</div>}

      {/* The Openings sample and the queue (18 Nov). */}
      <section className="flex flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
        <span className={figmaLabel}>SAMPLE DATA · LAPTOP ONLY</span>
        <p className="text-[14px] text-ink-soft">
          Five invented clients and six openings, one in each state (JD to approve, searching, a set ready, a set with
          the client, hold at five, waiting for TA, closed), with their adverts, interviews and clocks. Your data is
          copied aside first; removing the sample takes out only its rows.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {sampleIn ? (
            <form action={devRemoveOpeningsSample}>
              <button type="submit" className={pillSecondary}>Remove the Openings sample</button>
            </form>
          ) : (
            <form action={devLoadOpeningsSample}>
              <button type="submit" className={pillPrimary}>Load the Openings sample</button>
            </form>
          )}
          <form action={devTaPushQueue}>
            <button type="submit" className={pillSecondary}>TA reads the queue now ({waitingWrites} waiting)</button>
          </form>
        </div>
      </section>

      {positions.length === 0 && (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          No openings yet. Hand a lead over to TA from its requirement view first, then come back.
        </div>
      )}

      {positions.map((position) => {
        const client = position.clientId ? clientIn(db, position.clientId) : null;
        const sets = db.clientSets.filter((s) => s.openingTaId === position.openingTaId && position.openingTaId);
        const interviews = db.interviews.filter((iv) => iv.positionId === position.id);
        const placements = db.placements.filter((p) => p.positionId === position.id);
        const people = sets.flatMap((s) => s.candidates);
        return (
          <section key={position.id} className="flex flex-col gap-[18px] rounded-[28px] bg-surface px-7 py-[26px] shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={"/positions/" + position.id} className="text-[18px] font-medium text-ink hover:text-brand">
                {client?.name ?? position.clientTaId} · {position.title}
              </Link>
              <span className="text-[13px] text-ink-soft">
                {position.openingTaId ? "Opening " + position.openingTaId : "Waiting for TA to create the opening"}
              </span>
            </div>

            {!position.openingTaId ? (
              <form action={devTaCreateOpening}>
                <input type="hidden" name="positionId" value={position.id} />
                <button type="submit" className={pillPrimary}>
                  TA creates the opening
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <form action={devTaSendSet}>
                  <input type="hidden" name="positionId" value={position.id} />
                  <button type="submit" className={pillSecondary}>
                    TA says a set of five CVs is ready ({sets.length} so far)
                  </button>
                </form>
              </div>
            )}

            {position.openingTaId && position.stage !== "closed" && (
              <div className="flex flex-wrap items-center gap-3">
                {!position.jdApprovedAt && (
                  <form action={devTaOpening}>
                    <input type="hidden" name="positionId" value={position.id} />
                    <input type="hidden" name="type" value="opening.jd_approved" />
                    <button type="submit" className={pillSecondary}>TA approves the JD</button>
                  </form>
                )}
                <form action={devTaOpening}>
                  <input type="hidden" name="positionId" value={position.id} />
                  <input type="hidden" name="type" value="opening.closed" />
                  <button type="submit" className={pillSecondary}>TA closes the opening</button>
                </form>
              </div>
            )}

            {(pipelines.get(position.id) ?? []).length > 0 && (
              <form action={devTaStage} className="flex flex-wrap items-end gap-2 border-t border-rule pt-3">
                <input type="hidden" name="positionId" value={position.id} />
                <label className={figmaLabel + " min-w-[240px]"}>
                  TA moves
                  <select name="applicationId" className={figmaField}>
                    {(pipelines.get(position.id) ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.candidateName} · now {a.currentStage.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={figmaLabel + " min-w-[180px]"}>
                  to
                  <select name="stage" className={figmaField}>
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={pillSecondary}>Move, and count the shortlist</button>
              </form>
            )}

            {(() => {
              const mine = timers.filter(
                (t) =>
                  (t.subjectType === "position" && t.subjectId === position.id) ||
                  (t.subjectType === "clientSet" && sets.some((s) => s.id === t.subjectId)) ||
                  (t.subjectType === "ad" && db.ads.some((ad) => ad.id === t.subjectId && ad.positionId === position.id)) ||
                  (t.subjectType === "hold" && db.holds.some((h) => h.id === t.subjectId && h.openingTaId === position.openingTaId)) ||
                  // The money clocks too (18 Nov): joining, the invoice and the guarantee.
                  (t.subjectType === "placement" && placements.some((p) => p.id === t.subjectId)) ||
                  (t.subjectType === "invoice" && db.invoices.some((i) => i.id === t.subjectId && placements.some((p) => p.id === i.placementId))) ||
                  (t.subjectType === "guarantee" && db.guarantees.some((g) => g.id === t.subjectId && placements.some((p) => p.id === g.placementId))),
              );
              if (mine.length === 0) return null;
              return (
                <div className="flex flex-col gap-2 border-t border-rule pt-3">
                  <span className={figmaLabel}>CLOCKS · MOVE ONE TO NOW</span>
                  {mine.map((t) => (
                    <form key={t.id} action={devMoveClock} className="flex flex-wrap items-center gap-3 text-[14px] text-ink">
                      <input type="hidden" name="timerId" value={t.id} />
                      <span className="min-w-[320px]">
                        {clockWords[t.kind] ?? t.kind} · {t.payload.label ?? ""} · due {new Date(t.dueAt + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                      <button type="submit" className={pillSecondary}>Make it due now</button>
                    </form>
                  ))}
                </div>
              );
            })()}

            {interviews.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-rule pt-3">
                <span className={figmaLabel}>INTERVIEWS · WHAT TA TELLS US</span>
                {interviews.map((iv) => (
                  <div key={iv.id} className="flex flex-wrap items-center gap-2 text-[14px] text-ink">
                    <Link href={"/interviews/" + iv.id} className="min-w-[200px] hover:text-brand">
                      {iv.candidateName} · round {iv.round} · {iv.state}
                    </Link>
                    {[
                      ["interview.confirmed", "", "Reconfirmed"],
                      ["interview.outcome", "interview.outcome", "Attended"],
                      ["interview.outcome", "interview.outcome:no_show", "No-show"],
                      ["interview.feedback", "", "Candidate feedback"],
                      ["interview.candidate_out", "", "Candidate out"],
                    ].map(([type, sample, label]) => (
                      <form key={label} action={devTaInterviewEvent}>
                        <input type="hidden" name="interviewId" value={iv.id} />
                        <input type="hidden" name="type" value={type} />
                        <input type="hidden" name="sample" value={sample || type} />
                        <button type="submit" className={pillSecondary}>
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {position.openingTaId && people.length > 0 && (
              <form action={devTaPlace} className="flex flex-wrap items-end gap-2 border-t border-rule pt-3">
                <input type="hidden" name="positionId" value={position.id} />
                <label className={figmaLabel + " min-w-[260px]"}>
                  TA places
                  <select name="applicationId" className={figmaField}>
                    {people.map((c) => (
                      <option key={c.applicationTaId} value={c.applicationTaId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" name="how" value="joining" className={pillSecondary}>
                  TA places them (LKR 450,000, joining in 14 days)
                </button>
                <button type="submit" name="how" value="offer" className={pillSecondary}>
                  Offer only (no date or letter yet)
                </button>
              </form>
            )}

            {placements.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-[14px] text-ink">
                <Link href={"/placements/" + p.id} className="min-w-[200px] hover:text-brand">
                  {p.candidateName} · {p.state}
                </Link>
                {p.state === "placed" && (
                  <>
                    {[
                      ["joined", "TA says they joined"],
                      ["no_show", "TA says they never turned up"],
                    ].map(([outcome, label]) => (
                      <form key={outcome} action={devTaJoined}>
                        <input type="hidden" name="placementId" value={p.id} />
                        <input type="hidden" name="outcome" value={outcome} />
                        <button type="submit" className={pillSecondary}>
                          {label}
                        </button>
                      </form>
                    ))}
                  </>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
