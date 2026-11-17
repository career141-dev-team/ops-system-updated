import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  devTaCreateOpening,
  devTaInterviewEvent,
  devTaJoined,
  devTaPlace,
  devTaSendSet,
} from "@/app/actions";
import { PageBox, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { clientIn, desk, positionsNewestFirst } from "@/data/desk";
import { fakeTa } from "@/lib/ta";
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

  return (
    <PageBox width="1080" className="gap-6">
      <div className="flex flex-col gap-1">
        <span className={figmaLabel}>DEVELOPMENT ONLY</span>
        <h1 className="text-[32px] font-light leading-[40px] text-ink">Pretend to be the TA System</h1>
        <p className="max-w-[70ch] text-[14px] text-ink-soft">
          Everything here is invented and goes through the same handlers as a real TA event. Do the Ops steps on the
          real screens, then press what TA would say here. It cannot run against the real TA System.
        </p>
      </div>

      {msg && <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</div>}

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
          <section key={position.id} className="flex flex-col gap-4 rounded-[24px] bg-sunk px-6 py-5">
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
                <button type="submit" className={pillSecondary}>
                  TA places them (LKR 450,000, joining in 14 days)
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
    </PageBox>
  );
}
