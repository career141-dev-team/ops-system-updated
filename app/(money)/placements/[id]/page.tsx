import { relatedWork } from "@/data/journeyOf";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  cancelPlacement,
  changeJoinDate,
  correctSalarySplit,
  draftInvoiceForPlacement,
  markJoined,
  markNoShow,
  recordNoShowChoice,
} from "@/app/actions";
import Icon from "@/app/Icon";
import {
  BackBar,
  FoldRow,
  RelatedLinks,
  NextStepCard,
  PageBox,
  SegmentedBar,
  StatTile,
  ViewPills,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import {
  checklistsNewestFirst,
  clientIn,
  desk,
  guaranteesNewestFirst,
  invoiceIn,
  member as memberIn,
  numberOf,
  placementIn,
  positionIn,
} from "@/data/desk";
import { daysLeftInWords, guaranteeInWords } from "@/lib/guarantee";
import {
  NO_SHOW_CHOICES,
  feeAmount,
  feeInWords,
  invoiceInWords,
  missingPlacementFields,
  money,
  placementInWords,
  moneyWhole,
} from "@/lib/money";
import { placementNextStep } from "@/lib/nextStep";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function colomboDate(at: number): Date {
  return new Date(at + 5.5 * 3_600_000);
}

function shortDate(at: number): string {
  const d = colomboDate(at);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function longDate(at: number): string {
  const d = colomboDate(at);
  return `${d.getUTCDate()} ${LONG_MONTHS[d.getUTCMonth()]}`;
}

/**
 * Frames `1:2783` (PL · Offer — deciding),
 * `1:1294` (PL · Placement — joining day),
 * `1:3414` (PL · Not joined — client chooses), and
 * `1:2873` (PL · Placement — Finance / Joined tab).
 */
export default async function PlacementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; view?: string; at?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const { msg, view, at } = await searchParams;

  const now = Date.now();
  const db = await desk();
  const placement = placementIn(db, id);
  if (!placement) notFound();
  const position = placement.positionId ? positionIn(db, placement.positionId) : null;
  const client = placement.clientId ? clientIn(db, placement.clientId) : null;
  const owner = memberIn(db, placement.ownerId);
  const invoice = placement.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const guarantee =
    guaranteesNewestFirst(db).find((g) => g.placementId === placement.id) ?? null;
  const checklist =
    checklistsNewestFirst(db).find(
      (c) =>
        (placement.positionId && c.positionId === placement.positionId) ||
        c.openingTaId === placement.openingTaId,
    ) ?? null;

  const missing = missingPlacementFields(placement);
  const theirAudit = db.audit
    .filter((a) => a.subjectType === "placement" && a.subjectId === id)
    .slice(0, 12);
  const mayManage = can(me, "client.manage");

  const day = (at: number) => colomboDate(at).toISOString().slice(0, 10);
  const whenLocal = (at: number) =>
    colomboDate(at).toISOString().slice(0, 16).replace("T", " ");

  const step = placementNextStep(
    placement,
    {
      missing,
      feeSaid: feeInWords({
        feeMonths: placement.feeMonths,
        feeBasis: placement.feeBasis,
      }),
      invoiceState: invoice ? invoice.state : null,
    },
    now,
  );

  const firstName =
    placement.candidateName.split(" ")[0] || placement.candidateName;
  const roleTitle = position?.title ?? `Opening ${placement.openingTaId}`;
  const clientName = client?.name ?? "Client";

  const isOfferStage =
    placement.state === "placed" &&
    (!placement.joinDate || !placement.offerLetterFileRef);
  const isNoShow = placement.state === "no_show";
  const isJoined = placement.state === "joined";

  // Default sub-view tab
  const activeView =
    view ?? (isJoined ? "finance" : "overview");

  const basePath = `/placements/${placement.id}`;
  const subViews = [
    { key: "overview", label: "Overview", href: `${basePath}?view=overview` },
    { key: "joining", label: "Joining", href: `${basePath}?view=joining` },
    { key: "guarantee", label: "Guarantee", href: `${basePath}?view=guarantee` },
    { key: "finance", label: "Finance", href: `${basePath}?view=finance` },
    { key: "activity", label: "Activity", href: `${basePath}?view=activity` },
  ];

  // Calculate estimated fee for preview
  const estimatedFeeAmount = placement.monthlySalary
    ? feeAmount(placement, placement.monthlySalary, placement)
    : null;
  const maySplit = can(me, "money.manage") || mayManage;
  const estimatedFeeText = invoice
    ? moneyWhole(invoice.amount, invoice.currency)
    : estimatedFeeAmount
      ? moneyWhole(estimatedFeeAmount, placement.currency)
      : feeInWords(placement);

  // The guarantee's own length once it runs, the setting before (18 Nov: "90" and "30 days" were written in).
  const guaranteeDays = guarantee
    ? Math.max(1, Math.round((guarantee.endsAt - guarantee.startsAt) / 86_400_000))
    : numberOf(db, "guarantee.days", 90);
  const dueDays = numberOf(db, "invoice.dueDays", 30);
  const guaranteeEndAt =
    guarantee?.endsAt ?? (placement.joinDate ?? now) + guaranteeDays * 86_400_000;
  const guaranteeElapsedDays = guarantee
    ? Math.max(1, Math.min(guaranteeDays, Math.ceil((now - guarantee.startsAt) / 86_400_000)))
    : 0;
  const joinDay = placement.joinDate ? new Date(placement.joinDate + 5.5 * 3_600_000).toISOString().slice(0, 10) : null;
  const today = new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const joinsToday = joinDay === today;

  const checklistDoneCount = checklist
    ? checklist.items.filter((i) => Boolean(i.doneAt)).length
    : 0;
  const checklistTotalCount = checklist ? checklist.items.length : 0;

  return (
    <PageBox width="1080" className="gap-6">
      <BackBar
        href="/placements"
        label={isNoShow ? placement.candidateName : "Placements"}
      />

      {/* Header (1:2795 / 1:1306 / 1:3426 / 1:2885) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[14px] leading-[21px] text-ink-faint">
          {isOfferStage && (
            <>
              <span>Offer</span>
              <span>·</span>
            </>
          )}
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
          {isNoShow && placement.joinDate && (
            <>
              <span>·</span>
              <span>was due {shortDate(placement.joinDate)}</span>
            </>
          )}
        </div>
        <h1 className="text-[32px] font-light leading-[40px] text-ink md:text-[40px] md:leading-[50px]">
          {isNoShow ? `${firstName} didn’t join` : placement.candidateName}
        </h1>
      </div>

      {/* Plain links to the rest of this client's work (18 Nov), then this placement's own views once the offer is made. */}
      {!isNoShow && <RelatedLinks items={relatedWork(db, { placementId: placement.id })} active="placement" />}
      {!(isOfferStage && !view) && !isNoShow && <ViewPills items={subViews} active={activeView} />}

      {msg && !at && (
        <p className="rounded-[20px] bg-brand-tint px-5 py-3 text-[14px] font-medium text-brand-ink">
          {msg}
        </p>
      )}

      {/* ===================================================================
          CASE 1: Frame `1:3414` — PL · Not joined (no_show — client chooses)
         =================================================================== */}
      {isNoShow && (activeView === "overview" || activeView === "joining") && (
        <NextStepCard
          eyebrow="UP NEXT · THE CLIENT DECIDES"
          title={
            placement.noShowChoice
              ? NO_SHOW_CHOICES[placement.noShowChoice] ?? placement.noShowChoice
              : `Ask ${clientName}: replace them, or stop?`
          }
          body="No invoice goes out, because they never joined — and there is no refund."
        >
          {/* 2 Choice Cards (Frame 1:3433) */}
          <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2">
            <div
              className={
                placement.noShowChoice !== "close"
                  ? "flex flex-col gap-0.5 rounded-[24px] border-2 border-brand bg-brand-tint px-[18px] py-4"
                  : "flex flex-col gap-0.5 rounded-[24px] bg-sunk px-[18px] py-4"
              }
            >
              <p className="text-[16px] font-medium leading-[26px] text-ink">
                Replace {firstName}
              </p>
              <p className="text-[14px] leading-[21px] text-ink-faint">
                The TA searches again on the same opening
              </p>
            </div>
            <div
              className={
                placement.noShowChoice === "close"
                  ? "flex flex-col gap-0.5 rounded-[24px] border-2 border-brand bg-brand-tint px-[18px] py-4"
                  : "flex flex-col gap-0.5 rounded-[24px] bg-sunk px-[18px] py-4"
              }
            >
              <p className="text-[16px] font-medium leading-[26px] text-ink">
                Stop
              </p>
              <p className="text-[14px] leading-[21px] text-ink-faint">
                We close the posts and the position
              </p>
            </div>
          </div>

          {mayManage && !placement.noShowChoice && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <form action={recordNoShowChoice} className="flex flex-wrap items-center gap-2.5">
                <input type="hidden" name="placementId" value={placement.id} />
                <select
                  name="choice"
                  defaultValue="replace"
                  className="rounded-full border border-rule-strong bg-surface px-4 py-2.5 text-[14px] text-ink"
                >
                  {Object.entries(NO_SHOW_CHOICES).map(([key, what]) => (
                    <option key={key} value={key}>
                      {what}
                    </option>
                  ))}
                </select>
                <button className={pillPrimary}>Record their choice</button>
              </form>
              {client && (
                <Link href={`/clients/${client.id}`} className={pillSecondary}>
                  Message {client.name}
                </Link>
              )}
            </div>
          )}
        </NextStepCard>
      )}

      {/* ===================================================================
          CASE 2: Frame `1:2783` — PL · Offer (deciding / pre-joining)
         =================================================================== */}
      {isOfferStage && (activeView === "overview" || activeView === "joining") && (
        <>
          <NextStepCard
            eyebrow={`WHOSE MOVE · ${firstName.toUpperCase()}’S`}
            title={`${firstName} is deciding on the offer`}
            body={
              missing.length > 0
                ? `Missing from the TA System: ${missing.join(", ")}. The search stopped when the offer went out, and a back-up is kept in case they say no.`
                : "The search stopped when the offer went out. A back-up is kept in case they say no."
            }
          >
            {mayManage && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a href="#fold-joining" className={pillPrimary}>
                  They accepted
                </a>
                <a href="#fold-cancel" className={pillSecondary}>
                  They declined
                </a>
              </div>
            )}
          </NextStepCard>

          {/* 3 Stat Tiles (Frame 1:2853) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              value={
                placement.monthlySalary
                  ? money(placement.monthlySalary, placement.currency)
                  : "TBC"
              }
              caption="a month, offered"
              size="md"
            />
            <StatTile
              value={placement.joinDate ? shortDate(placement.joinDate) : "TBC"}
              caption="start date asked for"
              size="md"
            />
            <StatTile
              value={feeInWords(placement)}
              caption="agreed fee"
              size="md"
            />
          </div>
        </>
      )}

      {/* ===================================================================
          CASE 3: Frame `1:1294` — PL · Placement — Verify joining day
         =================================================================== */}
      {!isOfferStage &&
        !isNoShow &&
        !isJoined &&
        (activeView === "overview" || activeView === "joining") && (
          <>
            <NextStepCard
              eyebrow={joinsToday ? "TODAY · JOINING DAY" : "JOINING DAY"}
              clock={joinsToday ? "9:00 call" : !joinDay ? "No date yet" : joinDay < today ? "Join day passed" : "Joins " + joinDay}
              clockTone={joinDay && joinDay < today ? "danger" : "warn"}
              title={joinsToday || !joinDay ? `Did ${firstName} start today?` : joinDay < today ? `Did ${firstName} start on ${joinDay}?` : `${firstName} joins on ${joinDay}`}
              body="The TA calls them at 9:00 on the joining day and taps the answer here. Their answer starts two things at once."
            >
              {mayManage && placement.state === "placed" && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <form action={markJoined}>
                    <input type="hidden" name="placementId" value={placement.id} />
                    <button className={pillPrimary}>
                      {firstName} joined
                    </button>
                  </form>
                  <a href="#fold-noshow" className={pillSecondary}>
                    Didn’t join
                  </a>
                </div>
              )}
            </NextStepCard>

            {/* Two tracks: "When they join — both start together" (Frame 1:1318) */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex w-full shrink-0 flex-col gap-1 text-[14px] leading-[21px] md:w-[150px]">
                <p className="font-medium text-ink">When {firstName} joins</p>
                <p className="text-ink-faint">both start together</p>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Track 1: Invoice (1:1322) */}
                <div className="flex flex-col gap-2 rounded-[24px] bg-sunk px-[22px] py-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface text-ink">
                      <Icon name="wallet" size={16} />
                    </span>
                    <p className="text-[16px] font-medium leading-[26px] text-ink">
                      Invoice
                    </p>
                  </div>
                  <p className="text-[14px] leading-[21px] text-ink-soft">
                    {placement.isReplacementOf
                      ? "Replacement under guarantee · no second fee"
                      : `Drafted for you to approve · ${estimatedFeeText}`}
                  </p>
                  <p className="text-[14px] leading-[21px] text-ink-faint">
                    Due {dueDays} days after joining
                  </p>
                </div>

                {/* Track 2: 90-day guarantee (1:1331) */}
                <div className="flex flex-col gap-2 rounded-[24px] bg-sunk px-[22px] py-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface text-ink">
                      <Icon name="shield" size={16} />
                    </span>
                    <p className="text-[16px] font-medium leading-[26px] text-ink">
                      {guaranteeDays}-day guarantee
                    </p>
                  </div>
                  <p className="text-[14px] leading-[21px] text-ink-soft">
                    Starts the day they join · ends {longDate(guaranteeEndAt)}
                  </p>
                  <p className="text-[14px] leading-[21px] text-ink-faint">
                    If they leave, we replace them first
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Column Summary Row (Frame 1:1340) */}
            <div className="flex flex-wrap items-start gap-7 px-1 py-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                  Package
                </p>
                <p className="text-[14px] leading-[21px] text-ink">
                  {placement.monthlySalary
                    ? `${money(placement.monthlySalary, placement.currency)} a month`
                    : "Not given"}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                  Joining date
                </p>
                <p className="text-[14px] leading-[21px] text-ink">
                  {placement.joinDate ? shortDate(placement.joinDate) : "Not given"}
                  {placement.dojHistory.length > 0 &&
                    ` · moved ${placement.dojHistory.length === 1 ? "once" : `${placement.dojHistory.length} times`}`}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                  Offer letter
                </p>
                <p className="text-[14px] leading-[21px] text-ink">
                  {placement.offerLetterFileRef ? "Received" : "Not given"}
                </p>
              </div>
            </div>
          </>
        )}

      {/* ===================================================================
          CASE 4: Frame `1:2873` — PL · Placement — Finance / Joined tab
         =================================================================== */}
      {(activeView === "finance" || (isJoined && activeView === "overview")) && (
        <div className="flex flex-col gap-6">
          {/* 3 Big Stat Tiles (Frame 1:2895) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              outline
              value={estimatedFeeText}
              caption={`fee · ${feeInWords(placement)}`}
              size="lg"
            />
            <StatTile
              value={
                placement.isReplacementOf
                  ? "No charge"
                  : invoice?.state === "paid"
                    ? "Paid"
                    : invoice
                      ? invoice.state.replace(/_/g, " ")
                      : "Pending"
              }
              outline
              highlight={invoice?.state === "paid" ? "ok" : undefined}
              tone={invoice?.state === "paid" ? "ok" : "default"}
              caption={
                invoice?.paidAt
                  ? `in full on ${shortDate(invoice.paidAt)}`
                  : invoice
                    ? invoiceInWords(invoice, now)
                    : "drafted on joining day"
              }
              size="lg"
            />
            <StatTile
              value={
                guarantee?.refundAmount
                  ? moneyWhole(guarantee.refundAmount, invoice?.currency ?? "LKR")
                  : "None"
              }
              caption="refund"
              outline
              size="lg"
            />
          </div>

          {/* LINKED IN FINANCE list (Frame 1:2906) */}
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.4px] text-ink-faint">
              LINKED IN FINANCE
            </p>

            {/* Item 1: Invoice (1:2908) */}
            <Link
              href={invoice ? `/invoices/${invoice.id}` : "/invoices"}
              className="flex items-center gap-3.5 rounded-[16px] px-2 py-2.5 transition-colors hover:bg-sunk"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink">
                <Icon name="wallet" size={17} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[16px] leading-[26px] text-ink">
                  {invoice ? `Invoice ${invoice.number}` : "Placement fee invoice"}
                </p>
                <p className="text-[14px] leading-[21px] text-ink-faint">
                  {invoice
                    ? invoiceInWords(invoice, now)
                    : `Drafted on joining day · due ${dueDays} days after joining`}
                </p>
              </div>
              <span
                className={`text-[14px] leading-[21px] ${
                  invoice?.state === "paid" ? "text-ok" : "text-ink-faint"
                }`}
              >
                {invoice?.state === "paid"
                  ? "Paid"
                  : invoice
                    ? invoice.state.replace(/_/g, " ")
                    : "Not drafted"}
              </span>
              <Icon name="chevron-right" size={18} className="text-ink-faint" />
            </Link>

            {!invoice && placement.state === "joined" && !placement.isReplacementOf && (mayManage || can(me, "money.manage")) && (
              <form action={draftInvoiceForPlacement} className="flex flex-col gap-1.5 px-2 pb-1">
                <input type="hidden" name="placementId" value={placement.id} />
                <SubmitButton id="draft-invoice" className={pillSecondary + " self-start"}>
                  Draft the invoice
                </SubmitButton>
                <p className="text-[12.5px] text-ink-soft">
                  They joined and there is no invoice yet. If the client&rsquo;s billing details or the package are missing, it says which.
                </p>
              </form>
            )}

            {/* Item 2: 90-day guarantee (1:2919) */}
            <Link
              href={guarantee ? `/guarantees/${guarantee.id}` : `${basePath}?view=guarantee`}
              className="flex items-center gap-3.5 rounded-[16px] px-2 py-2.5 transition-colors hover:bg-sunk"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink">
                <Icon name="shield" size={17} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[16px] leading-[26px] text-ink">
                  {guaranteeDays}-day guarantee
                </p>
                <p className="text-[14px] leading-[21px] text-ink-faint">
                  {guarantee
                    ? `Ends ${shortDate(guarantee.endsAt)} · ${guarantee.state === "replacing" ? "replacing" : "nothing to do"}`
                    : `Ends ${shortDate(guaranteeEndAt)} · starts when joined`}
                </p>
              </div>
              <span className="text-[14px] leading-[21px] text-ink-faint">
                {guarantee ? `Day ${guaranteeElapsedDays} of ${guaranteeDays}` : `${guaranteeDays} days`}
              </span>
              <Icon name="chevron-right" size={18} className="text-ink-faint" />
            </Link>

            {/* Item 3: Close the posts (1:2930) */}
            <Link
              href={checklist ? `/closes/${checklist.id}` : "/closes"}
              className="mt-2 flex items-center gap-3.5 rounded-[16px] px-2 py-2.5 transition-colors hover:bg-sunk"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunk text-ink">
                <Icon name="flag" size={17} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[16px] leading-[26px] text-ink">
                  Close the posts
                </p>
                <p className="text-[14px] leading-[21px] text-ink-faint">
                  {checklist ? "Every advert comes down before the opening closes" : "Opens when the guarantee ends, or the search stops"}
                </p>
              </div>
              <span className="text-[14px] leading-[21px] text-ink-faint">
                {checklist ? `${checklistDoneCount} of ${checklistTotalCount} done` : "Not started"}
              </span>
              <Icon name="chevron-right" size={18} className="text-ink-faint" />
            </Link>
          </div>

          {/* Single-copy note (Frame 1:2941) */}
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-ink-faint">
            <Icon name="link" size={15} className="text-ink-faint" />
            <p>
              Invoices live in Finance. This tab only shows them, so there is never a second copy.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUB-VIEW: Guarantee tab (`?view=guarantee`)
         =================================================================== */}
      {activeView === "guarantee" && (
        <div className="flex flex-col gap-5">
          {guarantee ? (
            <>
              <SegmentedBar
                total={30}
                filled={Math.min(30, Math.max(1, Math.round((guaranteeElapsedDays / guaranteeDays) * 30)))}
                tone={guarantee.state === "replacing" ? "warn" : "brand"}
                caption={`Day ${guaranteeElapsedDays} of ${guaranteeDays} · ${daysLeftInWords(guarantee.endsAt, now)}`}
              />
              <NextStepCard
                eyebrow={`${guaranteeDays}-DAY GUARANTEE`}
                clock={daysLeftInWords(guarantee.endsAt, now)}
                clockTone={guarantee.state === "replacing" ? "warn" : "neutral"}
                title={guaranteeInWords(guarantee, now, db.holidays.map((h) => h.date))}
                body={
                  guarantee.feePaidAt
                    ? `The fee was paid in full on ${day(guarantee.feePaidAt)}, so the guarantee holds: if ${firstName} leaves within ${guaranteeDays} days, we replace them first.`
                    : "The fee is not paid in full yet, so the guarantee only starts holding the day the fee is settled."
                }
              >
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link href={`/guarantees/${guarantee.id}`} className={pillPrimary}>
                    Open guarantee record
                  </Link>
                </div>
              </NextStepCard>
            </>
          ) : (
            <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
              The {guaranteeDays}-day guarantee starts automatically on the day {firstName} joins.
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          Collapsible Folds for all actions & history
         =================================================================== */}
      <div className="flex flex-col gap-3">
        {/* Fold: the basic / allowances split behind the fee (16 Nov) */}
        {maySplit && placement.monthlySalary && (
          <FoldRow
            title="Fold · Basic salary and allowances"
            summary={
              placement.basicSalary
                ? `Basic ${money(placement.basicSalary, placement.currency)} + allowances ${money(placement.allowances, placement.currency)}`
                : "Split not known - the fee uses the salary as TA gave it"
            }
            defaultOpen={!placement.basicSalary && placement.state === "joined"}
          >
            <p className="mb-3 max-w-[70ch] text-[14px] text-ink-soft">
              The fee is {feeInWords(placement)}. {placement.package ? `TA's package: ${placement.package}` : "TA gave no package text."}
            </p>
            <form action={correctSalarySplit} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="placementId" value={placement.id} />
              <label className={`min-w-[160px] ${figmaLabel}`}>
                Basic, a month
                <input name="basicSalary" defaultValue={placement.basicSalary ?? ""} className={figmaField} />
              </label>
              <label className={`min-w-[160px] ${figmaLabel}`}>
                Allowances, a month
                <input name="allowances" defaultValue={placement.allowances} className={figmaField} />
              </label>
              <label className={`min-w-[240px] flex-1 ${figmaLabel}`}>
                Why
                <input name="reason" className={figmaField} />
              </label>
              <button className={pillSecondary}>Save the split</button>
            </form>
          </FoldRow>
        )}

        {/* Fold: Joining day actions (markJoined, markNoShow, changeJoinDate, cancelPlacement) */}
        {placement.state === "placed" && mayManage && (
          <div id="fold-joining">
            <FoldRow
              title="Fold · The joining day & date changes"
              summary={
                placement.dojHistory.length
                  ? `Moved ${placement.dojHistory.length} ${placement.dojHistory.length === 1 ? "time" : "times"}`
                  : placement.joinDate
                    ? `Due ${day(placement.joinDate)}`
                    : "Set or move the joining date"
              }
              defaultOpen={activeView === "joining" || step.at === "joining"}
            >
              <p className="mb-3 max-w-[70ch] text-[14px] text-ink-soft">
                The TA phones them on the morning. Marking them joined drafts the invoice at once, because the {dueDays}
                days run from their first working day whether or not anybody remembered.
              </p>

              <form action={markJoined} className="flex flex-col">
                <input type="hidden" name="placementId" value={placement.id} />
                <button className={`${pillPrimary} self-start`}>
                  They joined
                </button>
              </form>

              <form
                id="fold-noshow"
                action={markNoShow}
                className="mt-4 flex flex-col gap-3 border-t border-rule pt-4"
              >
                <input type="hidden" name="placementId" value={placement.id} />
                <label className={figmaLabel}>
                  They never turned up — what happened?
                  <input name="reason" className={figmaField} />
                </label>
                <p className="text-[14px] text-ink-faint">
                  Nothing is invoiced and nothing is refunded. The client chooses a replacement or stopping, and that
                  choice is drafted for them.
                </p>
                <button className={`${pillSecondary} self-start`}>
                  Mark a no-show
                </button>
              </form>

              <form
                action={changeJoinDate}
                className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4"
              >
                <input type="hidden" name="placementId" value={placement.id} />
                <label className={`min-w-[180px] ${figmaLabel}`}>
                  The day moved to
                  <input name="joinDate" type="date" className={figmaField} />
                </label>
                <label className={`min-w-[240px] flex-1 ${figmaLabel}`}>
                  Why
                  <input name="reason" className={figmaField} />
                </label>
                <button className={pillSecondary}>Move it</button>
              </form>

              <form
                id="fold-cancel"
                action={cancelPlacement}
                className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4"
              >
                <input type="hidden" name="placementId" value={placement.id} />
                <label className={`min-w-[240px] flex-1 ${figmaLabel}`}>
                  We lost them before joining — why
                  <input name="reason" className={figmaField} />
                </label>
                <button className={pillSecondary}>Cancel the placement</button>
              </form>
            </FoldRow>
          </div>
        )}

        {/* Fold: What the TA System sent */}
        <FoldRow
          title="Fold · What the TA System sent"
          done={missing.length === 0}
          summary={
            missing.length ? `${missing.join(" and ")} still missing` : "Complete · package, offer letter & date"
          }
          defaultOpen={step.at === "details"}
        >
          <div className="flex flex-col gap-1.5 text-[14px] text-ink">
            <p>
              <span className="text-ink-faint">Package: </span>
              {placement.monthlySalary
                ? `${money(placement.monthlySalary, placement.currency)} a month`
                : "not given"}
            </p>
            <p>
              <span className="text-ink-faint">Offer letter: </span>
              {placement.offerLetterFileRef ? "with the placement in TA" : "not given"}
            </p>
            <p>
              <span className="text-ink-faint">Joining day: </span>
              {placement.joinDate ? day(placement.joinDate) : "not given"}
              {placement.joinedAt && ` · joined ${day(placement.joinedAt)}`}
            </p>
            <p>
              <span className="text-ink-faint">Fee: </span>
              {feeInWords(placement)} — from the agreement as it stood the day they were placed
            </p>
          </div>

          {missing.length > 0 && (
            <p className="mt-3 text-[13px] text-warn">
              Missing: {missing.join(", ")}. The invoice cannot be built without the package, so this is asked of the TA
              System rather than guessed.
            </p>
          )}

          {placement.dojHistory.length > 0 && (
            <div className="mt-3 border-t border-rule pt-3">
              <p className="text-[13px] text-ink-soft">
                The joining day has moved {placement.dojHistory.length}{" "}
                {placement.dojHistory.length === 1 ? "time" : "times"}:
              </p>
              {placement.dojHistory.map((move, i) => (
                <p key={i} className="mt-1 text-[14px] text-ink-faint">
                  {move.from ? day(move.from) : "—"} → {day(move.to)} · {move.reason}
                </p>
              ))}
            </div>
          )}
        </FoldRow>

        {/* Fold: What happened to it */}
        <FoldRow
          title="Fold · What happened to it"
          summary={theirAudit.length + (theirAudit.length === 1 ? " entry" : " entries")}
          defaultOpen={activeView === "activity"}
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
            {placementInWords(placement, now)}
          </p>
        </FoldRow>
      </div>
    </PageBox>
  );
}
