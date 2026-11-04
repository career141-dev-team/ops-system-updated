import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { markInvoiceDisputed, raiseCreditNote, recordPayment, sendInvoice, writeOffInvoice } from "@/app/actions";
import { clientIn, desk, invoiceIn, member as memberIn, placementIn, positionIn } from "@/data/desk";
import {
  INVOICE_MEANINGS,
  WRITE_OFF_DAYS,
  type InvoiceState,
  balanceOf,
  feeInWords,
  invoiceLines,
  money,
  paidSoFar,
} from "@/lib/money";
import NextStep from "@/app/NextStep";
import Part from "@/app/Part";
import { invoiceNextStep } from "@/lib/nextStep";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/** One invoice: what it says, what has come in, and what is still owed. */
export default async function InvoicePage({
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
  const invoice = invoiceIn(db, id);
  if (!invoice) notFound();
  const placement = invoice.placementId ? placementIn(db, invoice.placementId) : null;
  const client = invoice.clientId ? clientIn(db, invoice.clientId) : null;
  const theirAudit = db.audit.filter((a) => a.subjectType === "invoice" && a.subjectId === id).slice(0, 12);
  const mayMoney = can(me, "money.manage") || can(me, "refund.decide");
  const balance = balanceOf(invoice);
  const notes = db.invoices.filter((i) => i.againstInvoiceId === invoice.id);

  const lines = invoiceLines({
    number: invoice.number,
    candidateName: placement?.candidateName ?? "",
    positionTitle: positionIn(db, placement?.positionId ?? "")?.title ?? "",
    clientName: client?.billingName || client?.name || "",
    feeWords: feeInWords({ feeMonths: placement?.feeMonths ?? 1, feeBasis: placement?.feeBasis ?? "gross" }),
    monthlySalary: placement?.monthlySalary ?? 0,
    amount: invoice.amount,
    lateCharge: invoice.lateCharge,
    payments: invoice.payments,
    joinedAt: placement?.joinedAt ?? null,
    dueAt: invoice.dueAt,
    currency: invoice.currency,
  });

  const day = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  // What to do now (24, step 5). These are the rules a wrong screen costs
  // real money for, so the card says them: 1% a month compounded, nothing at
  // all on a disputed invoice, and no write-off inside ninety days.
  const step = invoiceNextStep(
    invoice,
    {
      owedSaid: money(balance, invoice.currency),
      lateChargeSaid: invoice.lateCharge ? money(invoice.lateCharge, invoice.currency) : null,
      billingEmail: client?.billingEmail ?? "",
      writeOffAfterDays: WRITE_OFF_DAYS,
    },
    now,
  );

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const field = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const button = "self-start rounded-full bg-brand px-4 py-1.5 text-[13px] text-white hover:opacity-90";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";

  return (
    <div className="flex max-w-[800px] flex-col gap-4">
      <div>
        <Link href="/invoices" className="text-[12.5px] text-brand hover:underline">
          Back to the invoices
        </Link>
        <h1 className="mt-2 text-[17px] font-medium">{invoice.number}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {INVOICE_MEANINGS[invoice.state as InvoiceState] ?? invoice.state} ·{" "}
          {memberIn(db, invoice.ownerId)?.name ?? "nobody"} keeps it
          {placement && (
            <>
              {" · "}
              <Link href={"/placements/" + placement.id} className="text-brand hover:underline">
                {placement.candidateName}
              </Link>
            </>
          )}
        </p>
        {invoice.about && <p className="mt-1 max-w-[70ch] text-[12.5px] text-ink-faint">{invoice.about}</p>}
        {invoice.disputed && (
          <p className="mt-1 text-[12.5px] text-warning">
            Disputed in good faith, so no late charge is added: {invoice.disputedReason}
          </p>
        )}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <NextStep where={step.where} waiting={step.waiting} clock={step.clock} />

      <Part
        title="As the client reads it"
        says={"The lines that go in the message"}
        open={step.at === "send"}
      >
        <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{lines}</p>
        <p className="mt-3 text-[12px] text-ink-faint">
          The invoice document itself waits on a template from the owner, exactly as the agreement did. Until then
          these lines go in the body of the email — a real invoice to pay against, and not a form we invented.
        </p>
      </Part>

      {invoice.state === "draft" && mayMoney && (
        <Part
          title="Send it"
          says={client?.billingEmail || "No billing address on the client"}
          open={step.at === "send" || step.at === "client"}
        >
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            It goes to the billing address on the client&rsquo;s record, as a draft you approve. The clock that chases
            it starts from the due date.
          </p>
          <form action={sendInvoice} className="mt-3 flex flex-col">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button className={button}>Draft it for the client</button>
          </form>
        </Part>
      )}

      {invoice.state !== "draft" && (
        <Part
          title="Money in"
          says={money(balance, invoice.currency) + " still owed"}
          open={step.at === "payment"}
        >
          <p className="mt-1 text-[13px]">
            {money(invoice.amount, invoice.currency)} invoiced
            {invoice.lateCharge > 0 && " · " + money(invoice.lateCharge, invoice.currency) + " late charge"}
            {paidSoFar(invoice) > 0 && " · " + money(paidSoFar(invoice), invoice.currency) + " received"}
            {invoice.state !== "written_off" && balance > 0 && " · " + money(balance, invoice.currency) + " owed"}
          </p>
          {invoice.payments.map((payment, i) => (
            <p key={i} className="mt-1 text-[12.5px] text-ink-soft">
              {money(payment.amount, invoice.currency)} on {day(payment.paidAt)} by {payment.method}
              {payment.note && " · " + payment.note}
            </p>
          ))}

          {balance > 0 && invoice.state !== "written_off" && mayMoney && (
            <form action={recordPayment} className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule pt-3">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <label className="flex w-[150px] flex-col gap-1 text-[12.5px] text-ink-soft">
                How much came in
                <input name="amount" type="number" step="0.01" min="0" className={field} />
              </label>
              <label className="flex w-[170px] flex-col gap-1 text-[12.5px] text-ink-soft">
                How
                <input name="method" placeholder="bank transfer" className={field} />
              </label>
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
                Anything to note
                <input name="note" className={field} />
              </label>
              <button className={plain}>Record it</button>
            </form>
          )}
        </Part>
      )}

      {invoice.state !== "draft" && invoice.state !== "paid" && mayMoney && (
        <Part
          title="When it is not paid"
          says={"Disputed, chased, or written off"}
          open={step.at === "disputed"}
        >

          <form action={markInvoiceDisputed} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            {invoice.disputed ? (
              <>
                <input type="hidden" name="settled" value="yes" />
                <button className={plain}>The dispute is settled</button>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  They say something is wrong with it — what
                  <input name="reason" className={field} />
                </label>
                <button className={plain}>Mark it disputed, and stop the charge</button>
              </>
            )}
          </form>

          {invoice.state !== "written_off" && (
            <form action={writeOffInvoice} className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                Write it off — why
                <input name="reason" className={field} />
              </label>
              <p className="text-[12px] text-ink-faint">
                Writing a fee off voids the guarantee and closes the position, so it waits ninety days unless the
                Director of Operations decides sooner.
              </p>
              <button className={plain}>Write it off</button>
            </form>
          )}
        </Part>
      )}

      {invoice.kind !== "credit_note" && invoice.state !== "draft" && mayMoney && (
        <Part
          title="A credit note"
          says={"Against this invoice, with a reason"}
          open={false}
        >
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            For a refund under the guarantee, or a correction to an invoice we got wrong. It is a document of its own,
            drafted for the client like everything else.
          </p>
          {notes.length > 0 &&
            notes.map((note) => (
              <p key={note.id} className="mt-2 text-[13px]">
                <Link href={"/invoices/" + note.id} className="text-brand hover:underline">
                  {note.number}
                </Link>{" "}
                <span className="text-ink-soft">
                  — {money(note.amount, note.currency)} · {note.reason}
                </span>
              </p>
            ))}
          <form action={raiseCreditNote} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="flex w-[150px] flex-col gap-1 text-[12.5px] text-ink-soft">
              How much
              <input name="amount" type="number" step="0.01" min="0" className={field} />
            </label>
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12.5px] text-ink-soft">
              Why
              <input name="why" className={field} />
            </label>
            <button className={plain}>Raise it</button>
          </form>
        </Part>
      )}

      {invoice.kind === "credit_note" && invoice.againstInvoiceId && (
        <p className="text-[13px]">
          Against{" "}
          <Link href={"/invoices/" + invoice.againstInvoiceId} className="text-brand hover:underline">
            {invoiceIn(db, invoice.againstInvoiceId)?.number ?? "the invoice"}
          </Link>
          .
        </p>
      )}

      <Part
        title="What happened to it"
        says={theirAudit.length + (theirAudit.length === 1 ? " entry" : " entries")}
        open={false}
      >
        {theirAudit.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {theirAudit.map((entry) => (
          <div key={entry.id} className="border-t border-rule py-2 first:border-t-0">
            <p className="text-[12.5px]">
              {entry.action}
              {entry.after && <span className="text-ink-soft"> → {entry.after}</span>}
            </p>
            <p className="text-[12px] text-ink-faint">
              {whenLocal(entry.at)}
              {entry.reason && " · " + entry.reason}
            </p>
          </div>
        ))}
        {invoice.sentMessageId && (
          <p className="mt-2 text-[12.5px]">
            <Link href={"/messages/" + invoice.sentMessageId} className="text-brand hover:underline">
              The email it went in
            </Link>
          </p>
        )}
      </Part>
    </div>
  );
}
