import { relatedWork } from "@/data/journeyOf";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  confirmNationality,
  markInvoiceDisputed,
  previewInvoice,
  raiseCreditNote,
  recordPayment,
  recordPaymentDetails,
  requestPaymentDetails,
  sendInvoice,
  writeOffInvoice,
} from "@/app/actions";
import {
  agreementForLead,
  clientIn,
  desk,
  numberOf,
  invoiceIn,
  member as memberIn,
  placementIn,
  positionIn,
} from "@/data/desk";
import {
  Card,
  PageTitle,
  RelatedLinks,
  StatTile,
  StatusChip,
  figmaField,
  figmaLabel,
  pillDanger,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import StepCard from "../StepCard";
import { DraftDocument } from "@/app/ui/AgreementVersions";
import { FieldList } from "@/app/ui/FieldList";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { viewHref } from "@/lib/files";
import { invoiceVersions } from "@/lib/invoiceDoc";
import { day } from "@/lib/listing";
import {
  WRITE_OFF_DAYS,
  balanceOf,
  daysUntilDue,
  feeInWords,
  feeMonthsFor,
  invoiceBlockers,
  invoiceInWords,
  invoiceLines,
  isExpat,
  money,
  paidSoFar,
  problemWithPaymentOn,
} from "@/lib/money";
import { invoiceNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/** One block of the record: a v6 card with a title and a small line. */
function Section({ title, summary, children }: { title: string; summary?: string; children: React.ReactNode }) {
  return (
    <Card title={title} sub={summary}>
      {children}
    </Card>
  );
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; at?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");

  const { id } = await params;
  const sp = await searchParams;
  const db = await desk();
  const inv = invoiceIn(db, id);
  if (!inv) notFound();

  const client = inv.clientId ? clientIn(db, inv.clientId) : null;
  const placement = inv.placementId ? placementIn(db, inv.placementId) : null;
  const placementRole = placement?.positionId
    ? positionIn(db, placement.positionId)?.title ?? placement.candidateName
    : placement?.candidateName ?? null;
  const guarantee = placement
    ? db.guarantees.find((g) => g.placementId === placement.id) ?? null
    : null;
  const canMoney = can(me, "money.manage");
  const now = Date.now();
  const bal = balanceOf(inv);
  const paid = paidSoFar(inv);
  const overdue = Boolean(
    inv.dueAt && inv.dueAt < now && inv.state !== "paid" && inv.state !== "written_off",
  );

  // The settings, not the code's defaults (18 Nov).
  const writeOffDays = numberOf(db, "invoice.writeOffDays", WRITE_OFF_DAYS);
  const blockers = inv.kind === "fee" && inv.state === "draft" ? invoiceBlockers(placement) : [];
  const dueLeft = daysUntilDue(inv.dueAt, now);
  const step = invoiceNextStep(
    inv,
    {
      owedSaid: money(bal, inv.currency),
      lateChargeSaid: inv.lateCharge > 0 ? money(inv.lateCharge, inv.currency) : null,
      billingEmail: client?.billingEmail ?? "",
      writeOffAfterDays: writeOffDays,
      blockers,
    },
    now,
  );

  const linesText = invoiceLines({
    number: inv.number,
    candidateName: placement?.candidateName ?? client?.name ?? "Client",
    positionTitle: placementRole ?? inv.about ?? "Placement fee",
    clientName: client?.billingName || client?.name || "Client",
    feeWords: placement ? feeInWords({ feeMonths: feeMonthsFor(placement), feeBasis: placement.feeBasis }) : "placement fee",
    monthlySalary: placement?.monthlySalary ?? inv.amount,
    amount: inv.amount,
    lateCharge: inv.lateCharge,
    payments: inv.payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt })),
    joinedAt: placement?.joinedAt ?? null,
    dueAt: inv.dueAt,
    currency: inv.currency,
  });

  const hasTemplate = db.files.some(
    (f) => f.kind === (inv.kind === "credit_note" ? "credit_note_template" : "invoice_template") && f.subjectType === null,
  );
  // The invoice as a document, version by version (owner, 17 Nov), and what it is made from.
  const docFiles = db.files.filter((f) => f.kind === "invoice" && f.subjectType === "invoice" && f.subjectId === inv.id);
  const versions = invoiceVersions(docFiles);
  const newest = versions[0] ?? null;
  const agreement = client?.leadId ? agreementForLead(db, client.leadId) : null;
  const agreementSigned = agreement?.state === "signed" || agreement?.state === "countersigned";
  const history = db.audit
    .filter((e) => e.subjectType === "invoice" && e.subjectId === inv.id)
    .sort((a, b) => b.at - a.at);

  const cardShell = "flex flex-col gap-3";
  const status = (
    <StatusChip tone={inv.state === "paid" ? "ok" : inv.state === "disputed" || overdue ? "danger" : inv.state === "sent" || inv.state === "partly_paid" ? "warn" : "quiet"}>
      {invoiceInWords(inv)}
    </StatusChip>
  );

  return (
    <div className="flex flex-col gap-[22px]">
        <PageTitle
          title={client?.name ?? "Client"}
          sub={
            <>
              Invoice {inv.number} ·{" "}
              {placementRole ? `${placementRole} placement` : inv.kind === "surcharge" ? "surcharge invoice" : inv.kind === "credit_note" ? "credit note" : inv.about} ·{" "}
              <Link href="/invoices" className="underline">Back to Invoices</Link>
            </>
          }
          right={status}
        />

        {placement && <RelatedLinks items={relatedWork(db, { placementId: placement.id })} active="invoice" />}

        {sp.msg && !sp.at && (
          <div className="t-body rounded-[18px] bg-brand-tint px-4 py-3">
            {sp.msg}
          </div>
        )}

        <StepCard
          tone={overdue ? "danger" : "warn"}
          chip={
            inv.dueAt && inv.state !== "paid" && inv.state !== "written_off"
              ? overdue
                ? `Late payment · ${Math.abs(dueLeft ?? 0)} day${Math.abs(dueLeft ?? 0) === 1 ? "" : "s"} overdue`
                : dueLeft === 0
                  ? `Due today (${day(inv.dueAt)})`
                  : `Due in ${dueLeft} day${dueLeft === 1 ? "" : "s"} (${day(inv.dueAt)})`
              : undefined
          }
          title={step.where}
          body={step.waiting}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {inv.state === "draft" && canMoney && blockers.length === 0 && (
                <form action={sendInvoice}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <button type="submit" className={pillPrimary}>
                    Approve and send
                  </button>
                </form>
              )}
              {inv.state === "draft" && canMoney && placement && (
                <form action={requestPaymentDetails}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <button type="submit" className={pillSecondary}>
                    {inv.detailsRequestedAt ? `Details requested (${day(inv.detailsRequestedAt)}) · Ask again` : "Request payment details"}
                  </button>
                </form>
              )}
              {bal > 0 && canMoney && !problemWithPaymentOn(inv.state) && inv.kind !== "credit_note" && (
                  <Link
                    href={`/invoices/payment?invoiceId=${encodeURIComponent(inv.id)}`}
                    className={pillSecondary}
                  >
                    They paid — log it
                  </Link>
                )}
              {client && (
                <Link href={`/clients/${client.id}`} className={pillSecondary}>
                  Open client
                </Link>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            value={money(inv.amount, inv.currency)}
            label="invoice"
            caption={inv.sentAt ? `sent ${day(inv.sentAt)}` : "draft"}
          />
          <StatTile
            value={money(inv.lateCharge, inv.currency)}
            label={
              inv.lateMonths > 0
                ? `late charge, month ${inv.lateMonths}`
                : "late charge"
            }
            caption={inv.lateMonths > 0 ? `${numberOf(db, "invoice.latePctPerMonth", 5)}% a month, ${inv.lateMonths} ${inv.lateMonths === 1 ? "month" : "months"}` : "none accrued"}
          />
          <StatTile
            tone={overdue ? "danger" : "default"}
            value={money(bal, inv.currency)}
            label="owed now"
            caption={paid > 0 ? `${money(paid, inv.currency)} received` : "no payments yet"}
          />
        </div>

        <div className="flex flex-col gap-3">
          {(placement || guarantee) && (
            <Section title="Guarantee & placement" summary={placementRole ?? ""}>
              <div className={cardShell}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-[14px] text-ink-soft">
                    {placement && (
                      <p>
                        Placement: <strong className="text-ink">{placement.candidateName}</strong>{" "}
                        {placementRole ? (
                          <>
                            for <strong className="text-ink">{placementRole}</strong>
                          </>
                        ) : null}
                      </p>
                    )}
                    {guarantee && (
                      <p className="mt-1">
                        Guarantee status:{" "}
                        <strong className="text-ink">{guarantee.state.replace(/_/g, " ")}</strong>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {placement && (
                      <Link href={`/placements/${placement.id}`} className={pillSecondary}>
                        Open placement
                      </Link>
                    )}
                    {guarantee && (
                      <Link href={`/guarantees/${guarantee.id}`} className={pillSecondary}>
                        Open guarantee
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Card title="The invoice, as the client will get it">
            {newest ? (
              <DraftDocument file={newest.file} version={newest.version} />
            ) : (
              <p className="text-[14px] text-ink-soft">Press the button, and the invoice is drawn to your design and shown here.</p>
            )}
            {versions.length > 1 && (
              <ul className="flex flex-col divide-y divide-rule text-[14px]">
                {versions.map((v) => (
                  <li key={v.version} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="font-medium text-ink">v{v.version}</span>
                    <a href={viewHref(v.file)} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                      Open in a new tab
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {inv.state === "draft" && canMoney && (
              <form action={previewInvoice} className="flex flex-col gap-1.5">
                <input type="hidden" name="invoiceId" value={inv.id} />
                <SubmitButton id="make-invoice" className={pillSecondary + " self-start"}>
                  {newest ? "Make the invoice again" : "Make the invoice to look at"}
                </SubmitButton>
                <p className="text-[12.5px] text-ink-soft">
                  Made from this invoice, the placement, the client&rsquo;s billing details and your bank details in Settings. Nothing is sent. Changed the salary split or the billing details? Make it again: it becomes the next version.
                </p>
              </form>
            )}
            <FieldList
              items={[
                { label: "Billed to", value: client?.billingName },
                { label: "Billing address", value: client?.billingAddress },
                { label: "Billing email", value: client?.billingEmail },
                { label: "Candidate", value: placement?.candidateName ?? inv.about },
                {
                  label: "Candidate nationality",
                  value: placement
                    ? placement.nationalityConfirmedAt && placement.nationality
                      ? `${placement.nationality} (${isExpat(placement.nationality) ? `Expat — ${feeMonthsFor(placement)} months' salary` : `Local — ${feeMonthsFor(placement)} month${feeMonthsFor(placement) === 1 ? "" : "s"}' salary`})`
                      : `Not confirmed yet${placement.nationalityFromCv ? ` (CV: ${placement.nationalityFromCv})` : ""}`
                    : null,
                },
                { label: "Position", value: placementRole },
                { label: "Joined on", value: placement?.joinedAt ? day(placement.joinedAt) : null },
                {
                  label: "Offered salary (client payment details)",
                  value: placement?.paymentDetails
                    ? `${money(placement.paymentDetails.offeredSalary, inv.currency)} (received ${day(placement.paymentDetails.receivedAt)}${placement.paymentDetails.note ? " · " + placement.paymentDetails.note : ""})`
                    : placement
                      ? "Not received yet"
                      : null,
                },
                { label: "Package, as TA gave it", value: placement?.package },
                {
                  label: "Basic salary / allowances",
                  value:
                    placement?.basicSalary && placement.basicSalary > 0
                      ? money(placement.basicSalary, inv.currency) + " / " + money(placement.allowances, inv.currency)
                      : null,
                },
                {
                  label: "Fee rule",
                  value: placement ? feeInWords({ feeMonths: feeMonthsFor(placement), feeBasis: placement.feeBasis }) : null,
                },
                {
                  label: "Due",
                  value: inv.dueAt
                    ? `${day(inv.dueAt)}${dueLeft !== null && inv.state !== "paid" && inv.state !== "written_off" ? (dueLeft < 0 ? ` (${Math.abs(dueLeft)} day${Math.abs(dueLeft) === 1 ? "" : "s"} overdue)` : dueLeft === 0 ? " (due today)" : ` (${dueLeft} day${dueLeft === 1 ? "" : "s"} left)`) : ""}`
                    : null,
                },
                {
                  label: "Reminders sent",
                  value: inv.state !== "draft" ? `${inv.remindersSent ?? 0} of 3` : null,
                },
              ]}
            />
            {inv.state === "draft" && placement && (canMoney || can(me, "client.manage")) && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-rule pt-4 sm:grid-cols-2">
                <form action={confirmNationality} className="flex flex-col gap-3 rounded-[16px] border border-rule p-4">
                  <input type="hidden" name="placementId" value={placement.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <p className="t-body-m text-ink">1. Candidate nationality</p>
                  <p className="t-small text-ink-3">
                    {placement.nationalityConfirmedAt && placement.nationality
                      ? `Confirmed as ${placement.nationality} (${feeMonthsFor(placement)} month${feeMonthsFor(placement) === 1 ? "" : "s"} fee).`
                      : `Confirm nationality before sending${placement.nationalityFromCv ? ` (read from CV: ${placement.nationalityFromCv})` : ""}.`}
                  </p>
                  <div>
                    <label className={figmaLabel} htmlFor="nationality">Nationality</label>
                    <input
                      id="nationality"
                      name="nationality"
                      type="text"
                      required
                      defaultValue={placement.nationality || placement.nationalityFromCv || ""}
                      placeholder="e.g. Sri Lankan, Indian, Pakistani"
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <SubmitButton id="inv-confirm-nat" className={pillSecondary}>
                      Confirm nationality
                    </SubmitButton>
                  </div>
                </form>

                <form action={recordPaymentDetails} className="flex flex-col gap-3 rounded-[16px] border border-rule p-4">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <p className="t-body-m text-ink">2. Client payment details (ESA clause 2.12)</p>
                  <p className="t-small text-ink-3">
                    {placement.paymentDetails
                      ? `Recorded ${money(placement.paymentDetails.offeredSalary, inv.currency)} on ${day(placement.paymentDetails.receivedAt)}.`
                      : "Record the actual offered salary from the client to re-price the invoice."}
                  </p>
                  <div>
                    <label className={figmaLabel} htmlFor="offeredSalary">Offered monthly salary ({inv.currency})</label>
                    <input
                      id="offeredSalary"
                      name="offeredSalary"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={placement.paymentDetails?.offeredSalary ?? placement.monthlySalary ?? ""}
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <label className={figmaLabel} htmlFor="paymentDetailsNote">Note (optional)</label>
                    <input
                      id="paymentDetailsNote"
                      name="note"
                      type="text"
                      defaultValue={placement.paymentDetails?.note ?? ""}
                      placeholder="e.g. Confirmed by client finance"
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <SubmitButton id="inv-record-details" className={pillSecondary}>
                      Save payment details
                    </SubmitButton>
                  </div>
                </form>
              </div>
            )}
            {placement && !agreementSigned && (
              <p className="text-[12.5px] text-warn">
                No signed agreement on record for this client, so the standard fee (one month of gross salary) was used. Check it against what was agreed.
              </p>
            )}
          </Card>

          <Section
            title="As the client reads it"
            summary={inv.number}
          >
            <div className={cardShell}>
              <p className="mb-3 text-[13px] text-ink-soft">
                {hasTemplate
                  ? "Sending fills your uploaded Word template and attaches it as a PDF. The lines below are the same figures."
                  : "Sending attaches the invoice above as a PDF. The lines below are the same figures."}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.6] text-ink">
                {linesText}
              </pre>
              {inv.state === "draft" && canMoney && (
                <form action={sendInvoice} className="mt-4 flex justify-end">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <button type="submit" className={pillPrimary}>
                    Send invoice to client
                  </button>
                </form>
              )}
            </div>
          </Section>

          <Section
            title="Money in & log payment"
            summary={
              inv.payments.length > 0
                ? `${inv.payments.length} payment${inv.payments.length === 1 ? "" : "s"}`
                : "none yet"
            }
          >
            <div className={cardShell}>
              {inv.payments.length > 0 && (
                <div className="mb-5 divide-y divide-rule text-[13px]">
                  {inv.payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 py-2.5">
                      <div>
                        <span className="font-medium text-ink">
                          {money(p.amount, inv.currency)}
                        </span>
                        <span className="ml-2 text-ink-soft">
                          via {p.method} · {day(p.paidAt)}
                        </span>
                        {p.note && <span className="ml-2 text-ink-faint">Ref: {p.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canMoney && bal > 0 && !problemWithPaymentOn(inv.state) && inv.kind !== "credit_note" ? (
                <form action={recordPayment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <div>
                    <label className={figmaLabel} htmlFor="amount">
                      Amount received ({inv.currency})
                    </label>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={bal}
                      required
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <label className={figmaLabel} htmlFor="receivedAt">
                      Date received
                    </label>
                    <input
                      id="receivedAt"
                      name="receivedAt"
                      type="date"
                      defaultValue={new Date(now).toISOString().slice(0, 10)}
                      required
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <label className={figmaLabel} htmlFor="method">
                      Method
                    </label>
                    <select id="method" name="method" className={figmaField} defaultValue="bank">
                      <option value="bank">Bank transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className={figmaLabel} htmlFor="reference">
                      Reference
                    </label>
                    <input
                      id="reference"
                      name="reference"
                      type="text"
                      placeholder="Slip or transfer ref"
                      className={figmaField}
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <button type="submit" className={pillPrimary}>
                      Save payment
                    </button>
                    <Link
                      href={`/invoices/payment?invoiceId=${encodeURIComponent(inv.id)}`}
                      className={pillSecondary}
                    >
                      Open full payment screen
                    </Link>
                  </div>
                </form>
              ) : (
                <p className="text-[13px] text-ink-soft">
                  {bal <= 0 ? "This invoice is settled." : "Only accounts can log payments."}
                </p>
              )}
            </div>
          </Section>

          {inv.kind !== "credit_note" &&
            inv.state !== "paid" &&
            inv.state !== "written_off" &&
            canMoney && (
              <Section
                title="Dispute & write-off"
                summary={`Write-off after ${writeOffDays} days`}
              >
                <div className={cardShell}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <form action={markInvoiceDisputed} className="flex flex-col gap-3">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <label className={figmaLabel} htmlFor="dispute-reason">
                        Mark as disputed
                      </label>
                      <input
                        id="dispute-reason"
                        name="reason"
                        type="text"
                        required
                        placeholder="What did the client question?"
                        className={figmaField}
                      />
                      <div>
                        <button type="submit" className={pillSecondary}>
                          Mark disputed
                        </button>
                      </div>
                    </form>

                    <form action={writeOffInvoice} className="flex flex-col gap-3">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <label className={figmaLabel} htmlFor="writeoff-reason">
                        Write off balance
                      </label>
                      <input
                        id="writeoff-reason"
                        name="reason"
                        type="text"
                        required
                        placeholder="Why is this being written off?"
                        className={figmaField}
                      />
                      <div>
                        <button type="submit" className={pillDanger}>
                          Write off
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Section>
            )}

          {inv.kind !== "credit_note" && canMoney && (
            <Section title="Credit note" summary="Raise a credit note against this invoice">
              <div className={cardShell}>
                <form action={raiseCreditNote} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <div>
                    <label className={figmaLabel} htmlFor="credit-amount">
                      Credit amount ({inv.currency})
                    </label>
                    <input
                      id="credit-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={bal > 0 ? bal : inv.amount}
                      required
                      className={figmaField}
                    />
                  </div>
                  <div>
                    <label className={figmaLabel} htmlFor="credit-reason">
                      Reason
                    </label>
                    <input
                      id="credit-reason"
                      name="reason"
                      type="text"
                      required
                      placeholder="Guarantee refund or correction"
                      className={figmaField}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className={pillSecondary}>
                      Raise credit note
                    </button>
                  </div>
                </form>
              </div>
            </Section>
          )}

          <Section
            title="What happened to it"
            summary={`${history.length} event${history.length === 1 ? "" : "s"}`}
          >
            <div className={cardShell}>
              {history.length === 0 ? (
                <p className="text-[13px] text-ink-soft">No recorded events yet.</p>
              ) : (
                <div className="divide-y divide-rule text-[13px]">
                  {history.map((e) => {
                    const actor = e.actorId ? memberIn(db, e.actorId) : null;
                    return (
                      <div key={e.id} className="flex items-start justify-between gap-4 py-2.5">
                        <div>
                          <div className="font-medium text-ink">{e.action}</div>
                          {e.reason && <div className="text-ink-soft">{e.reason}</div>}
                        </div>
                        <div className="shrink-0 text-right text-ink-faint">
                          <div>{day(e.at)}</div>
                          {actor && <div>{actor.name}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
  );
}
