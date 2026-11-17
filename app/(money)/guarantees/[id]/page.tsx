import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { decideRefund, markRefunded, recordLeaver } from "@/app/actions";
import {
  BackBar,
  FoldRow,
  JourneyBar,
  NextStepCard,
  PageBox,
  SegmentedBar,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  clientIn,
  desk,
  guaranteeIn,
  invoiceIn,
  member as memberIn,
  placementIn,
  positionIn,
} from "@/data/desk";
import { workingDaysBetween } from "@/lib/calendar";
import {
  GUARANTEE_MEANINGS,
  REFUND_PCT,
  REPLACEMENT_WORKING_DAYS,
  WARN_DAY,
  type GuaranteeState,
  daysLeftInWords,
  guaranteeInWords,
  refundAmount,
} from "@/lib/guarantee";
import { money } from "@/lib/money";
import { guaranteeNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function colomboDate(at: number): Date {
  return new Date(at + 5.5 * 3_600_000);
}

function shortDate(at: number): string {
  const d = colomboDate(at);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

/**
 * Frame `1:1350` — PL · Guarantee — candidate left early (replacement) &
 * active 90-day guarantee record.
 */
export default async function GuaranteePage({
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
  const guarantee = guaranteeIn(db, id);
  if (!guarantee) notFound();
  const placement = placementIn(db, guarantee.placementId);
  const position = placement?.positionId ? positionIn(db, placement.positionId) : null;
  const client = guarantee.clientId ? clientIn(db, guarantee.clientId) : null;
  const owner = memberIn(db, guarantee.ownerId);
  const invoice = placement?.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const paid = invoice ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const holidays = db.holidays.map((h) => h.date);
  const theirAudit = db.audit
    .filter((a) => a.subjectType === "guarantee" && a.subjectId === id)
    .slice(0, 12);

  const day = (at: number) => colomboDate(at).toISOString().slice(0, 10);
  const whenLocal = (at: number) =>
    colomboDate(at).toISOString().slice(0, 16).replace("T", " ");

  const step = guaranteeNextStep(
    guarantee,
    {
      warnDay: WARN_DAY,
      refundPct: REFUND_PCT,
      replacementWorkingDays: REPLACEMENT_WORKING_DAYS,
    },
    now,
  );

  const firstName =
    guarantee.candidateName.split(" ")[0] || guarantee.candidateName;
  const roleTitle = position?.title ?? `Opening ${guarantee.openingTaId}`;
  const clientName = client?.name ?? "Client";

  const leftOnDay = guarantee.leftAt
    ? Math.max(1, Math.ceil((guarantee.leftAt - guarantee.startsAt) / 86_400_000))
    : null;

  const elapsedDaysOf90 = Math.max(
    1,
    Math.min(90, Math.ceil((now - guarantee.startsAt) / 86_400_000)),
  );
  const elapsedReplacementWorkingDays = guarantee.leftAt
    ? Math.max(1, workingDaysBetween(guarantee.leftAt, now, holidays))
    : 1;
  const replacementWorkingDaysLeft = Math.max(
    0,
    REPLACEMENT_WORKING_DAYS - elapsedReplacementWorkingDays,
  );

  return (
    <PageBox width="1080" className="gap-6">
      <BackBar
        href={placement ? `/placements/${placement.id}` : "/guarantees"}
        label={
          placement
            ? `${guarantee.candidateName} · placement`
            : "Guarantees"
        }
      />

      {/* Header (Frame 1:1362) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[14px] leading-[21px] text-ink-faint">
          <span>Guarantee case</span>
          <span>·</span>
          {position ? (
            <Link href={"/positions/" + position.id} className="hover:text-ink hover:underline">
              {position.title}
            </Link>
          ) : (
            <span>{roleTitle}</span>
          )}
          <span>·</span>
          {client ? (
            <Link href={"/clients/" + client.id} className="hover:text-ink hover:underline">
              {client.name}
            </Link>
          ) : (
            <span>{clientName}</span>
          )}
        </div>
        <h1 className="text-[32px] font-light leading-[40px] text-ink md:text-[40px] md:leading-[50px]">
          {leftOnDay
            ? `${firstName} left on day ${leftOnDay}`
            : guarantee.candidateName}
        </h1>
      </div>

      {/* 8-step JourneyBar (Frame 1:1365) */}
      <JourneyBar active="Guarantee" />

      {/* 30-segment Clock Bar (Frame 1:1420) */}
      {guarantee.state === "replacing" ? (
        <SegmentedBar
          total={30}
          filled={Math.min(
            30,
            Math.max(
              1,
              Math.round(
                (elapsedReplacementWorkingDays / REPLACEMENT_WORKING_DAYS) * 30,
              ),
            ),
          )}
          tone="brand"
          caption={`Day ${elapsedReplacementWorkingDays} of ${REPLACEMENT_WORKING_DAYS} working days to replace ${firstName}`}
        />
      ) : (
        <SegmentedBar
          total={30}
          filled={Math.min(30, Math.max(1, Math.round((elapsedDaysOf90 / 90) * 30)))}
          tone={guarantee.state === "warned" ? "warn" : "brand"}
          caption={`Day ${elapsedDaysOf90} of 90 · ${daysLeftInWords(guarantee.endsAt, now)}`}
        />
      )}

      {msg && (
        <p className="rounded-[20px] bg-brand-tint px-5 py-3 text-[14px] font-medium text-brand-ink">
          {msg}
        </p>
      )}

      {/* Next Step Card (Frame 1:1454) */}
      <NextStepCard
        eyebrow={`WHOSE MOVE · ${
          guarantee.state === "replacing"
            ? "THE TA’S"
            : step.where.toUpperCase()
        }`}
        clock={
          guarantee.state === "replacing"
            ? `${replacementWorkingDaysLeft} working days left`
            : (step.clock ?? daysLeftInWords(guarantee.endsAt, now))
        }
        clockTone={guarantee.state === "warned" ? "warn" : "neutral"}
        title={
          guarantee.state === "replacing"
            ? "The TA is searching for a replacement"
            : step.waiting
        }
        body={
          guarantee.state === "replacing"
            ? `The original placement stays linked, and no new fee is charged. If nobody is placed in time, the Director of Operations decides on a ${REFUND_PCT}% refund.`
            : guaranteeInWords(guarantee, now, holidays)
        }
      >
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {guarantee.state === "replacing" ? (
            <>
              <Link
                href={position ? `/positions/${position.id}` : "/positions"}
                className={pillPrimary}
              >
                Open the replacement opening
              </Link>
              <Link
                href={client ? `/clients/${client.id}` : "#fold-refund"}
                className={pillSecondary}
              >
                Tell the client how it’s going
              </Link>
            </>
          ) : (guarantee.state === "running" || guarantee.state === "warned") &&
            can(me, "client.manage") ? (
            <a href="#fold-leaver" className={pillSecondary}>
              Record that {firstName} left early
            </a>
          ) : null}
        </div>
      </NextStepCard>

      {/* Collapsible Folds (Frames 1:1456 & 1:1465) */}
      <div className="flex flex-col gap-3">
        {/* Fold 1: Original placement (Frame 1:1456) */}
        <FoldRow
          title="Original placement"
          done={Boolean(guarantee.feePaidAt)}
          summary={`Joined ${shortDate(guarantee.startsAt)} · ${
            guarantee.feePaidAt ? "fee paid in full" : "not until the fee is paid in full"
          }`}
          defaultOpen={step.at === "fee"}
        >
          {guarantee.feePaidAt ? (
            <p className="text-[14px] text-ink">
              The fee was paid in full on {day(guarantee.feePaidAt)}, so the guarantee holds: a replacement if somebody
              leaves.
            </p>
          ) : (
            <p className="text-[14px] text-warn">
              The fee is not paid in full, so as things stand the guarantee does not apply — if they left today, nothing
              would be replaced and nothing refunded. It starts holding the day the fee is settled.
            </p>
          )}
          {(guarantee.state === "running" || guarantee.state === "warned") && (
            <p className="mt-2 text-[13px] text-ink-faint">
              {daysLeftInWords(guarantee.endsAt, now)}. The warning comes on day 75, so a wobble is heard while there is
              still time.
            </p>
          )}
          {placement && (
            <p className="mt-3 text-[14px]">
              <Link href={`/placements/${placement.id}`} className="text-brand hover:underline">
                View original placement record →
              </Link>
            </p>
          )}
        </FoldRow>

        {/* Fold 2: Record early departure (when running or warned) */}
        {(guarantee.state === "running" || guarantee.state === "warned") &&
          can(me, "client.manage") && (
            <div id="fold-leaver">
              <FoldRow
                title="Fold · They have left"
                summary="The day they went, and why"
                defaultOpen={step.at === "running"}
              >
                <form
                  action={recordLeaver}
                  className="flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="guaranteeId" value={guarantee.id} />
                  <label className={`min-w-[170px] ${figmaLabel}`}>
                    The day they left
                    <input name="leftAt" type="date" className={figmaField} />
                  </label>
                  <label className={`min-w-[260px] flex-1 ${figmaLabel}`}>
                    Why, as far as anybody knows
                    <input name="reason" className={figmaField} />
                  </label>
                  <button className={pillPrimary}>Record it</button>
                </form>
                <p className="mt-3 text-[14px] text-ink-faint">
                  What happens next turns on one thing: whether the fee was paid. Paid means the position reopens and a
                  replacement comes first, with sixty working days to finalise one.
                </p>
              </FoldRow>
            </div>
          )}

        {/* Fold 3: Refund (Frame 1:1465) */}
        <div id="fold-refund">
          <FoldRow
            title="Refund"
            summary={
              guarantee.state === "refund_pending"
                ? `${guarantee.refundPct}% decided · ${money(guarantee.refundAmount ?? 0, invoice?.currency ?? "LKR")}`
                : guarantee.state === "refunded"
                  ? "Refunded"
                  : guarantee.state === "void"
                    ? "Void · fee was unpaid"
                    : guarantee.deadlineAt
                      ? `Only if not replaced by ${shortDate(guarantee.deadlineAt)}`
                      : "The Director decides it, never a clock"
            }
            defaultOpen={
              step.at === "replacement" || step.at === "refund"
            }
          >
            {guarantee.state === "replacing" && (
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink">
                  Left {guarantee.leftAt ? day(guarantee.leftAt) : "—"}: {guarantee.reason}
                </p>
                {guarantee.deadlineAt && (
                  <p className="text-[14px] text-ink-soft">
                    Sixty working days to finalise a replacement, which runs to {day(guarantee.deadlineAt)}.
                  </p>
                )}
                <p className="text-[13px] text-ink-faint">
                  The TA System has been asked to reopen the position. A replacement placed on it is not invoiced again,
                  and starts its own ninety days.
                </p>

                {can(me, "refund.decide") && (
                  <form
                    action={decideRefund}
                    className="mt-3 flex flex-col gap-3 border-t border-rule pt-4"
                  >
                    <input type="hidden" name="guaranteeId" value={guarantee.id} />
                    <label className={figmaLabel}>
                      Decide a refund instead — the reason, which is read years later
                      <input name="reason" className={figmaField} />
                    </label>
                    <p className="text-[14px] text-ink-faint">
                      The agreement says {REFUND_PCT}% of the fee paid, which would be{" "}
                      {money(refundAmount(paid), invoice?.currency ?? "LKR")}. Replacement first: this is yours to
                      decide, and the clock running out only puts the question.
                    </p>
                    {guarantee.deadlineAt && now < guarantee.deadlineAt && (
                      <label className="flex items-center gap-2 text-[14px] text-ink-soft">
                        <input type="checkbox" name="early" value="yes" /> I am deciding before the sixty working days
                        are up
                      </label>
                    )}
                    <button className={`${pillSecondary} self-start`}>
                      Decide a refund
                    </button>
                  </form>
                )}
              </div>
            )}

            {guarantee.state === "refund_pending" && (
              <div className="flex flex-col gap-3">
                <p className="text-[14px] text-ink">
                  {guarantee.refundPct}% of what was paid:{" "}
                  {money(guarantee.refundAmount ?? 0, invoice?.currency ?? "LKR")}, decided by{" "}
                  {memberIn(db, guarantee.decidedBy ?? "")?.name ?? "the Director"} on{" "}
                  {guarantee.decidedAt ? day(guarantee.decidedAt) : "—"}.
                </p>
                <p className="text-[13px] text-ink-faint">
                  Accounts raises the credit note. The credit note document waits on a template from the owner, the same
                  as the invoice.
                </p>
                {can(me, "money.manage") && (
                  <form action={markRefunded} className="flex flex-col">
                    <input type="hidden" name="guaranteeId" value={guarantee.id} />
                    <button className={`${pillPrimary} self-start`}>
                      The refund has gone
                    </button>
                  </form>
                )}
              </div>
            )}

            {guarantee.state === "void" && (
              <p className="text-[14px] text-ink-soft">
                They left on {guarantee.leftAt ? day(guarantee.leftAt) : "—"} and the fee was never paid in full, so
                there was no guarantee to honour: nothing replaced and nothing refunded. {guarantee.reason}
              </p>
            )}

            {guarantee.state !== "replacing" &&
              guarantee.state !== "refund_pending" &&
              guarantee.state !== "void" && (
                <p className="text-[14px] text-ink-soft">
                  If somebody leaves within the 90-day guarantee period while the fee is paid in full, a replacement
                  comes first. A refund is decided by the Director only if a replacement cannot be made in time.
                </p>
              )}
          </FoldRow>
        </div>

        {/* Fold 4: What happened to it */}
        <FoldRow
          title="Fold · What happened to it"
          summary={theirAudit.length + (theirAudit.length === 1 ? " entry" : " entries")}
        >
          {theirAudit.length === 0 && (
            <p className="text-[14px] text-ink-soft">Nothing yet.</p>
          )}
          <div className="flex flex-col divide-y divide-rule">
            {theirAudit.map((entry) => (
              <div key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[14px] text-ink">
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
          <p className="mt-3 text-[14px] text-ink-faint">
            {GUARANTEE_MEANINGS[guarantee.state as GuaranteeState] ?? guarantee.state}
          </p>
        </FoldRow>
      </div>
    </PageBox>
  );
}
