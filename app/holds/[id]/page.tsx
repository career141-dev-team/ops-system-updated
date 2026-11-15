import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { approveTheHold, liftTheHold } from "@/app/actions";
import {
  Avatar,
  BackBar,
  FoldRow,
  NextStepCard,
  PageBox,
  StatusChip,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import { clientIn, clientSetIn, desk, holdIn, member as memberIn } from "@/data/desk";
import { HOLD_MEANINGS, type HoldState } from "@/lib/clientFeedback";
import { holdNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * CL · Client on hold (Figma frame 1:3510).
 *
 * One hold: why it was proposed, the notice, and how it ends.
 */
export default async function HoldPage({
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
  const hold = holdIn(db, id);
  if (!hold) notFound();

  const mayManage = can(me, "client.manage");
  const client = hold.clientId ? clientIn(db, hold.clientId) : null;
  const set = hold.setId ? clientSetIn(db, hold.setId) : null;
  const ownerName = memberIn(db, hold.ownerId)?.name ?? "Unassigned";
  const theirAudit = db.audit.filter(
    (a) => a.subjectType === "hold" && a.subjectId === hold.id,
  );
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  const step = holdNextStep(hold, Date.now());
  const position = db.positions.find((p) => p.openingTaId === hold.openingTaId) ?? null;

  return (
    <PageBox width="1080" className="gap-7">
      <BackBar
        href="/clients?filter=hold"
        label="Clients"
        right={
          <div className="flex items-center gap-2.5">
            <StatusChip
              label={
                hold.state === "lifted"
                  ? "Hold lifted"
                  : hold.state === "proposed"
                    ? "Hold proposed"
                    : "On hold"
              }
              tone={hold.state === "lifted" ? "ok" : "warn"}
            />
            <Avatar name={ownerName} size="32" />
          </div>
        }
      />

      <div className="flex flex-col gap-1">
        <span className={figmaLabel}>Client · {ownerName}</span>
        <h1 className="text-[40px] font-light leading-[50px] text-ink">
          {client?.name ?? hold.openingTaId}
        </h1>
        <p className="text-[16px] font-normal leading-[26px] text-ink-soft">
          {HOLD_MEANINGS[hold.state as HoldState] ?? hold.state}
          {position ? ` · 1 opening (${position.title})` : ` · Opening ${hold.openingTaId}`}
          {set ? ` · ${set.name}` : ""}
        </p>
      </div>

      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {/* Hero NextStepCard (Figma 1:3529) */}
      <NextStepCard
        title={
          hold.state === "proposed"
            ? `No feedback for 30 days — put ${client?.name ?? hold.openingTaId} on hold?`
            : step.where
        }
        clock={
          step.clock
            ? {
                label: step.clock,
                tone: step.clock.includes("ago") ? "danger" : "warn",
                icon: "clock",
              }
            : { label: "30 days", tone: "warn", icon: "clock" }
        }
        body={`${hold.reason}. Putting a client on hold pauses TA work and sends them a polite notice — it never closes the role on its own. We check back in 30 days.`}
        byItself="Hold never closes a client automatically — a person decides after the 30-day review."
      >
        {mayManage && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {hold.state === "proposed" && (
              <>
                <form action={approveTheHold} className="flex flex-wrap items-center gap-2.5">
                  <input type="hidden" name="holdId" value={hold.id} />
                  <input
                    name="reason"
                    defaultValue=""
                    placeholder={hold.reason}
                    className="rounded-full bg-sunk px-4 py-2.5 text-[14px] text-ink outline-none sm:w-72"
                  />
                  <button type="submit" className={pillPrimary}>
                    Approve &amp; send hold notice
                  </button>
                </form>
                <form action={liftTheHold}>
                  <input type="hidden" name="holdId" value={hold.id} />
                  <input
                    type="hidden"
                    name="reason"
                    value="Keeping open — calling the client first."
                  />
                  <button type="submit" className={pillSecondary}>
                    Keep open — call them first
                  </button>
                </form>
              </>
            )}

            {hold.state === "on_hold" && (
              <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
                <input type="hidden" name="holdId" value={hold.id} />
                <input
                  name="reason"
                  required
                  placeholder="What changed? (e.g. client replied)"
                  className="rounded-full bg-sunk px-4 py-2.5 text-[14px] text-ink outline-none sm:w-72"
                />
                <button type="submit" className={pillPrimary}>
                  Lift the hold
                </button>
              </form>
            )}

            {hold.noticeMessageId && (
              <Link
                href={`/messages/${hold.noticeMessageId}`}
                className="px-3 py-2 text-[14px] font-medium text-brand hover:underline"
              >
                Edit notice
              </Link>
            )}
          </div>
        )}
      </NextStepCard>

      {/* Collapsible Folds (Figma 1:3542, 1:3543) */}
      <div className="flex flex-col gap-2.5">
        <FoldRow
          title={`Opening · ${position?.title ?? hold.openingTaId}`}
          summary={
            set
              ? `${set.name} (${set.candidates.length} CVs) · no feedback`
              : `Opening ${hold.openingTaId} · paused while on hold`
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
            <span className="text-ink-soft">
              {hold.state === "on_hold" && hold.heldAt
                ? `On hold since ${whenLocal(hold.heldAt)}`
                : `Proposed ${whenLocal(hold.proposedAt)}`}
              {hold.reviewAt ? ` · Next review ${whenLocal(hold.reviewAt)}` : ""}
            </span>
            <div className="flex items-center gap-3">
              {position && (
                <Link
                  href={`/positions/${position.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  Open position →
                </Link>
              )}
              {set && (
                <Link
                  href={`/sets/${set.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  Open CV set →
                </Link>
              )}
            </div>
          </div>
        </FoldRow>

        <FoldRow
          title="If they come back"
          summary="Any reply reopens the client and restarts the feedback clock from that day"
          defaultOpen={step.at === "review"}
        >
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-ink-soft">
              Any word from the client is enough. The TA System is told the opening is open again, and the feedback chase starts again from today.
            </p>
            {hold.state !== "lifted" && mayManage && (
              <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
                <input type="hidden" name="holdId" value={hold.id} />
                <input
                  name="reason"
                  required
                  placeholder="What changed?"
                  className={figmaField + " max-w-md"}
                />
                <button type="submit" className={pillSecondary}>
                  Lift the hold
                </button>
              </form>
            )}
          </div>
        </FoldRow>

        <FoldRow
          title="What happened to it"
          summary={`${theirAudit.length} ${theirAudit.length === 1 ? "entry" : "entries"}`}
        >
          <div className="flex flex-col gap-2">
            {theirAudit.length === 0 && (
              <p className="text-[14px] text-ink-soft">Nothing recorded yet.</p>
            )}
            {theirAudit.map((entry, i) => (
              <div
                key={entry.at + ":" + i}
                className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-1.5 text-[13px] first:border-t-0"
              >
                <span className="font-medium text-ink">{entry.action}</span>
                <span className="text-ink-soft">
                  {whenLocal(entry.at)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </span>
              </div>
            ))}
          </div>
        </FoldRow>
      </div>
    </PageBox>
  );
}
