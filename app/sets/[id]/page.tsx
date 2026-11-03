import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  dropFromClientSet,
  recordClientDecision,
  recordCvClaim,
  recordSetReceived,
  reviewClientSet,
  sendClientSet,
} from "@/app/actions";
import { clientIn, clientSetIn, desk, fileIn, liveHoldFor, member as memberIn, numberOf } from "@/data/desk";
import { MIN_CVS, STATE_MEANINGS, type SetState, dueInWords, whereItStands } from "@/lib/clientSets";
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
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One set, on its own page: who is in it, what is missing, and sending it. */
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
  const client = set.clientId ? clientIn(db, set.clientId) : null;
  const missing = set.candidates.filter((c) => !c.fileId);
  const ready = set.candidates.length >= MIN_CVS && missing.length === 0;
  const theirAudit = db.audit.filter((a) => a.subjectType === "clientSet" && a.subjectId === set.id);
  // Everything after the set counts from the day the client received it.
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

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div>
        <Link href="/sets" className="text-[12.5px] text-brand hover:underline">
          Back to the sets
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{set.name}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {STATE_MEANINGS[set.state as SetState] ?? set.state} · {memberIn(db, set.ownerId)?.name ?? "nobody"} owns it
          {client ? " · " : ""}
          {client && (
            <Link href={"/clients/" + client.id} className="text-brand hover:underline">
              the client
            </Link>
          )}
        </p>
        <p className="mt-1 text-[13px]">{whereItStands(set, now)}</p>
        {set.reason && <p className="mt-1 text-[13px]">{set.reason}</p>}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-medium">Who is in it</h2>
          <span className="text-[12.5px] text-ink-soft">
            {set.candidates.length} of at least {MIN_CVS}
          </span>
        </div>
        {set.candidates.map((who) => {
          const file = who.fileId ? fileIn(db, who.fileId) : null;
          return (
            <div
              key={who.applicationTaId}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0"
            >
              <span className="text-[13.5px]">{who.name}</span>
              {file ? (
                <Link href={"/api/files/" + file.id} className="text-[12.5px] text-brand hover:underline">
                  {file.name}
                </Link>
              ) : (
                <span className="text-[12.5px] text-danger">{who.problem ?? "no CV kept yet"}</span>
              )}
              <span className="ml-auto text-[11.5px] text-ink-faint">{who.applicationTaId}</span>
              {/* A candidate with no prepared CV has to come out, or the set
                  waits for TA for ever. It needs a reason, like every drop. */}
              {who.decision && (
                <span className="w-full text-[12.5px] text-ink-soft">
                  {DECISION_MEANINGS[who.decision as ClientDecision] ?? who.decision}
                  {who.decisionReason ? " · “" + who.decisionReason + "”" : ""}
                </span>
              )}
              {who.claimedAt && (
                <span
                  className={
                    "w-full text-[12.5px] " + (who.claimVerdict === "dropped" ? "text-ink-soft" : "text-danger")
                  }
                >
                  {who.claimVerdict === "dropped" ? "Theirs: " : "Claim refused: "}
                  {who.claimReason}
                </span>
              )}
              {mayManage && set.state === "sent" && !who.decision && !who.claimedAt && (
                <div className="flex w-full flex-col gap-2 pt-1">
                  <form action={recordClientDecision} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="setId" value={set.id} />
                    <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                    <select name="decision" className={field} defaultValue="shortlisted">
                      {CLIENT_DECISIONS.map((d) => (
                        <option key={d} value={d}>
                          {DECISION_MEANINGS[d]}
                        </option>
                      ))}
                    </select>
                    <input name="reason" placeholder="what the client said" className={field + " flex-1"} />
                    <button className={plain}>Record what they said</button>
                  </form>
                  <form action={recordCvClaim} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="setId" value={set.id} />
                    <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                    <button className={plain}>They say this one was already theirs</button>
                    <span className="text-[11.5px] text-ink-faint">
                      {window && now <= window.closesAt
                        ? "Inside the window, so the candidate comes out of the set"
                        : "The window has closed, so this would be refused"}
                    </span>
                  </form>
                </div>
              )}
              {mayManage && !who.fileId && set.state !== "sent" && (
                <form action={dropFromClientSet} className="flex w-full flex-wrap items-center gap-2 pt-1">
                  <input type="hidden" name="setId" value={set.id} />
                  <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
                  <input name="reason" placeholder="why they come out" className={field + " flex-1"} />
                  <button className={plain}>Take out of the set</button>
                </form>
              )}
            </div>
          );
        })}
        <p className="mt-3 text-[12px] text-ink-faint">
          Each CV is fetched from the TA System once and kept here, so what the client received can be read back a year
          later even if the TA System changes it.
        </p>
        {mayManage && set.state !== "sent" && (
          <form action={reviewClientSet} className="mt-3">
            <input type="hidden" name="setId" value={set.id} />
            <button className={plain}>{set.candidates.some((c) => c.fileId) ? "Fetch anything missing" : "Read the set and keep the CVs"}</button>
          </form>
        )}
      </section>

      {set.state !== "sent" && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">Send it</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            It goes to the client&apos;s own people — whoever the TA System has marked “hr” — with you copied, as a
            drafted email you approve. The CVs go with it.
          </p>
          {set.dueAt !== null && (
            <p className="mt-1 text-[12.5px] text-ink-soft">
              The agreement promised this set: {dueInWords(set.dueAt, now)}.
            </p>
          )}
          {!ready && (
            <p className="mt-2 text-[12.5px] text-ink-faint">
              {set.candidates.length < MIN_CVS
                ? "Short of " + MIN_CVS + " CVs. The search carries on until it is not."
                : "Some CVs are not here yet. Fetch them above, or the candidate comes out of the set."}
            </p>
          )}
          {mayManage && (
            <form action={sendClientSet} className="mt-3">
              <input type="hidden" name="setId" value={set.id} />
              <button className={button}>Draft the email and send</button>
            </form>
          )}
        </section>
      )}

      {set.state === "sent" && window && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">The clocks this set started</h2>
          <p className={"mt-1 text-[13px] " + (now > window.closesAt ? "text-ink-soft" : "")}>
            {windowInWords(window, now, holidays)}. After it, a claim that a candidate was already theirs is refused.
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            {heardAt === null
              ? silent === 0
                ? "Nothing back from them yet."
                : silent + (silent === 1 ? " day" : " days") + " of silence."
              : "Last heard from them " + (silent === 0 ? "today" : silent + (silent === 1 ? " day ago" : " days ago")) + "."}{" "}
            {feedback?.because}
          </p>
          {hold && (
            <p className="mt-1 text-[13px]">
              <Link href={"/holds/" + hold.id} className="text-brand hover:underline">
                {hold.state === "proposed" ? "A hold is proposed on this position" : "This position is on hold"}
              </Link>
              {" · "}
              {hold.reason}
            </p>
          )}
        </section>
      )}

      {set.state === "sent" && (
        <section className={card}>
          <h2 className="text-[14.5px] font-medium">When they received it</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Sent {set.sentAt ? whenLocal(set.sentAt) : "—"} to {set.sentTo.join(", ") || "nobody recorded"}.
            {set.sentMessageId && (
              <>
                {" "}
                <Link href={"/messages/" + set.sentMessageId} className="text-brand hover:underline">
                  Read what went
                </Link>
                .
              </>
            )}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Received: {set.receivedAt ? whenLocal(set.receivedAt) : "not recorded"}. The client&apos;s seven working
            days on these CVs, and the chase for their feedback, both count from this.
          </p>
          {mayManage && (
            <form action={recordSetReceived} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="setId" value={set.id} />
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                They actually received it (Colombo time)
                <input
                  type="datetime-local"
                  name="receivedAt"
                  defaultValue={set.receivedAt ? whenLocal(set.receivedAt).replace(" ", "T") : ""}
                  className={field}
                />
              </label>
              <button className={plain}>Correct the date</button>
            </form>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry, i) => (
          <div key={entry.at + ":" + i} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[13px]">{entry.action}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {whenLocal(entry.at)}
              {entry.reason ? " · " + entry.reason : ""}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
