import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  markInvoiceDisputed,
  raiseCreditNote,
  recordPayment,
  sendInvoice,
  writeOffInvoice,
} from "@/app/actions";
import {
  clientIn,
  desk,
  invoiceIn,
  member as memberIn,
  placementIn,
  positionIn,
} from "@/data/desk";
import {
  BackBar,
  ClockPill,
  FoldRow,
  JourneyBar,
  NextStepCard,
  PageBox,
  StatTile,
  StatusChip,
  figmaField,
  figmaLabel,
  pillDanger,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import { day } from "@/lib/listing";
import {
  WRITE_OFF_DAYS,
  balanceOf,
  invoiceInWords,
  invoiceLines,
  money,
  paidSoFar,
} from "@/lib/money";
import { invoiceNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
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

  const step = invoiceNextStep(
    inv,
    {
      owedSaid: money(bal, inv.currency),
      lateChargeSaid: inv.lateCharge > 0 ? money(inv.lateCharge, inv.currency) : null,
      billingEmail: client?.billingEmail ?? "",
      writeOffAfterDays: WRITE_OFF_DAYS,
    },
    now,
  );

  const linesText = invoiceLines({
    number: inv.number,
    candidateName: placement?.candidateName ?? client?.name ?? "Client",
    positionTitle: placementRole ?? inv.about ?? "Placement fee",
    clientName: client?.name ?? "Client",
    feeWords: "placement fee",
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
  const history = db.audit
    .filter((e) => e.subjectType === "invoice" && e.subjectId === inv.id)
    .sort((a, b) => b.at - a.at);

  const cardShell = "rounded-[24px] border border-rule bg-surface p-5";

  return (
    <PageBox width="1080">
      <div className="flex flex-col gap-6">
        <BackBar href="/invoices" label="Finance" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
              Invoice {inv.number} ·{" "}
              {placementRole
                ? `${placementRole} placement`
                : inv.kind === "surcharge"
                  ? "surcharge invoice"
                  : inv.kind === "credit_note"
                    ? "credit note"
                    : inv.about}
            </p>
            <h1 className="mt-1 text-[40px] font-light leading-[50px] text-ink">
              {client?.name ?? "Client"}
            </h1>
          </div>
          <StatusChip
            tone={
              inv.state === "paid"
                ? "ok"
                : inv.state === "disputed" || overdue
                  ? "danger"
                  : inv.state === "sent" || inv.state === "partly_paid"
                    ? "warn"
                    : "quiet"
            }
          >
            {invoiceInWords(inv)}
          </StatusChip>
        </div>

        <JourneyBar active="Guarantee" />

        {sp.msg && (
          <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3 text-[13px] font-medium text-ink">
            {sp.msg}
          </div>
        )}

        <NextStepCard
          eyebrow="UP NEXT"
          clock={
            inv.dueAt && inv.state !== "paid" && inv.state !== "written_off" ? (
              <ClockPill
                tone={overdue ? "danger" : "warn"}
                label={overdue ? `Overdue · due ${day(inv.dueAt)}` : `Due ${day(inv.dueAt)}`}
              />
            ) : undefined
          }
          title={step.where}
          body={step.waiting}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {inv.state === "draft" && canMoney && (
                <form action={sendInvoice}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={`/invoices/${inv.id}`} />
                  <button type="submit" className={pillPrimary}>
                    Approve and send
                  </button>
                </form>
              )}
              {bal > 0 &&
                canMoney &&
                inv.state !== "written_off" &&
                inv.kind !== "credit_note" && (
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
            caption={inv.lateMonths > 0 ? "5% monthly surcharge" : "none accrued"}
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
            <FoldRow title="Guarantee & placement" summary={placementRole ?? ""}>
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
            </FoldRow>
          )}

          <FoldRow
            title="As the client reads it"
            summary={inv.number}
            defaultOpen={inv.state === "draft"}
          >
            <div className={cardShell}>
              <p className="mb-3 text-[13px] text-ink-soft">
                {hasTemplate
                  ? "Sending fills your Word template and attaches it as a PDF. The lines below are the same figures."
                  : "No invoice template is uploaded yet, so the lines below go in the body of the email. Upload one on the Files screen as an invoice template and the PDF is attached instead."}
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
          </FoldRow>

          <FoldRow
            title="Money in & log payment"
            summary={
              inv.payments.length > 0
                ? `${inv.payments.length} payment${inv.payments.length === 1 ? "" : "s"}`
                : "none yet"
            }
            defaultOpen={inv.payments.length > 0}
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

              {canMoney && bal > 0 && inv.state !== "written_off" && inv.kind !== "credit_note" ? (
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
          </FoldRow>

          {inv.kind !== "credit_note" &&
            inv.state !== "paid" &&
            inv.state !== "written_off" &&
            canMoney && (
              <FoldRow
                title="Dispute & write-off"
                summary={`Write-off after ${WRITE_OFF_DAYS} days`}
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
              </FoldRow>
            )}

          {inv.kind !== "credit_note" && canMoney && (
            <FoldRow title="Credit note" summary="Raise a credit note against this invoice">
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
            </FoldRow>
          )}

          <FoldRow
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
          </FoldRow>
        </div>
      </div>
    </PageBox>
  );
}
