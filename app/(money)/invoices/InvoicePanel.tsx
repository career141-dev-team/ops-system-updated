import Link from "next/link";

import {
  previewInvoice,
  recordPayment,
  recordPaymentDetails,
  requestPaymentDetails,
  sendInvoice,
} from "@/app/actions";
import Icon from "@/app/Icon";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { clientIn, placementIn, positionIn } from "@/data/desk";
import type { OpsDatabase, OpsInvoice } from "@/data/types";
import { reminderText } from "@/lib/accountsBoard";
import { colomboDate } from "@/lib/calendar";
import { dayShort as day } from "@/lib/accountsBoard";
import {
  balanceOf,
  daysUntilDue,
  feeMonthsFor,
  invoiceBlockers,
  isExpat,
  money,
  problemWithPaymentOn,
} from "@/lib/money";
import CopyButton from "./CopyButton";

const smallBtn = "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";

/** The invoice panel (v6 A1 state, 180:499): why it is on the board, who to deal with, and the one thing to do. */
export default function InvoicePanel({
  db,
  inv,
  now,
  canMoney,
  closeHref,
  msg,
  latePct,
}: {
  db: OpsDatabase;
  inv: OpsInvoice;
  now: number;
  canMoney: boolean;
  closeHref: string;
  msg?: string;
  latePct: number;
}) {
  const client = inv.clientId ? clientIn(db, inv.clientId) : null;
  const placement = inv.placementId ? placementIn(db, inv.placementId) : null;
  const role = placement?.positionId ? positionIn(db, placement.positionId)?.title : null;
  const bal = balanceOf(inv);
  const late = Boolean(inv.dueAt && inv.dueAt < now && inv.state !== "paid" && inv.state !== "written_off" && inv.state !== "draft");
  const lateDays = inv.dueAt ? Math.floor((now - inv.dueAt) / 86_400_000) : 0;
  const dueLeft = daysUntilDue(inv.dueAt, now);
  const blockers = inv.kind === "fee" && inv.state === "draft" ? invoiceBlockers(placement) : [];
  const contact =
    client?.contacts?.find((c) => /financ|account|billing/i.test(c.role)) ??
    client?.contacts?.[0] ??
    (client?.billingEmail ? { name: client.billingName, email: client.billingEmail, phone: "", role: "Billing" } : null);
  const refusal = problemWithPaymentOn(inv.state);
  const canPay = canMoney && !refusal && bal > 0 && inv.kind !== "credit_note";
  const sub = [
    client?.name,
    placement ? [placement.candidateName, role].filter(Boolean).join(", ") + (placement.joinedAt ? ", joined " + day(placement.joinedAt) : "") : inv.about,
    money(inv.amount, inv.currency),
  ]
    .filter(Boolean)
    .join(" > ");

  const why = [
    placement?.joinedAt ? `${placement.candidateName} joined on ${day(placement.joinedAt)}` : null,
    placement
      ? placement.nationalityConfirmedAt && placement.nationality
        ? `Nationality: ${placement.nationality} (${isExpat(placement.nationality) ? `Expat · ${feeMonthsFor(placement)} months` : `Local · ${feeMonthsFor(placement)} month${feeMonthsFor(placement) === 1 ? "" : "s"}`})`
        : `Nationality not confirmed yet${placement.nationalityFromCv ? ` (CV: ${placement.nationalityFromCv})` : ""}`
      : null,
    inv.state === "draft"
      ? blockers.length > 0
        ? `Blocked from sending: ${blockers.join(" and ")}`
        : "The invoice is ready to send"
      : inv.state === "paid"
        ? "The invoice is paid"
        : inv.sentAt
          ? `Sent ${day(inv.sentAt)}, ${money(bal, inv.currency)} still owed`
          : null,
    inv.dueAt
      ? late
        ? `Due ${day(inv.dueAt)}, ${lateDays} day${lateDays === 1 ? "" : "s"} late`
        : dueLeft !== null
          ? `Due ${day(inv.dueAt)} (${dueLeft === 0 ? "due today" : `${dueLeft} day${dueLeft === 1 ? "" : "s"} left`})`
          : `Due ${day(inv.dueAt)}`
      : null,
    (inv.remindersSent ?? 0) > 0 ? `Reminders sent: ${inv.remindersSent} of 3` : null,
    inv.disputed ? "Disputed: no late charge runs while it is" : null,
  ].filter(Boolean) as string[];

  const check = (ok: boolean, label: string) => (
    <span
      key={label}
      className={"inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] t-label " + (ok ? "bg-ink text-ink-inverse" : "border border-rule bg-warn-soft text-warn")}
    >
      {ok && <Icon name="check" size={14} />}
      {ok ? label : label + " missing"}
    </span>
  );

  const reminder =
    inv.state !== "draft" && inv.state !== "paid" && inv.state !== "written_off" && inv.kind !== "credit_note"
      ? reminderText({
          firstName: (contact?.name ?? "").split(/\s+/)[0],
          number: inv.number,
          amount: money(bal, inv.currency),
          due: inv.dueAt ? day(inv.dueAt) : "its due date",
          pctPerMonth: latePct,
        })
      : null;

  return (
    <Panel kicker="Invoice" title={`Invoice ${inv.number}`} sub={sub} closeHref={closeHref}>
      {msg && <p role="status" className="t-body mb-4 rounded-[14px] bg-brand-tint px-4 py-3">{msg}</p>}

      <PanelSection title="Why now">
        <ul className="flex flex-col gap-2">
          {why.map((w) => (
            <li key={w} className="t-body flex gap-2.5 text-ink-2"><span className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />{w}</li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Who and how">
        <PanelField label="Billing check">
          <div className="flex flex-wrap gap-2">
            {check(Boolean(client?.billingName.trim()), "Name")}
            {check(Boolean(client?.billingAddress.trim()), "Address")}
            {check(Boolean(client?.billingEmail.trim()), "Email")}
          </div>
        </PanelField>
        {contact ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={contact.name} size="40" tone="neutral" />
              <div className="min-w-0">
                <p className="t-body-m">{contact.name || "Billing contact"}</p>
                <p className="t-small text-ink-3">{[contact.role, client?.name, contact.phone].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.phone && <a href={"tel:" + contact.phone.replace(/\s+/g, "")} className={smallBtn}><Icon name="phone" size={14} />Call</a>}
              {contact.email && <a href={"mailto:" + contact.email} className={smallBtn}><Icon name="mail" size={14} />Email</a>}
            </div>
          </>
        ) : (
          <p className="t-small text-ink-3">No billing contact on the client record yet.</p>
        )}
        {reminder && (
          <PanelField label="Reminder to copy">
            <p className="t-body rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{reminder}</p>
            <div><CopyButton text={reminder} label="Copy a reminder" /></div>
            <p className="t-small text-ink-3">Nothing is sent from here. Paste it into your own email or WhatsApp.</p>
          </PanelField>
        )}
      </PanelSection>

      {inv.state === "draft" && (
        <PanelSection title="Before sending">
          {blockers.length > 0 && (
            <p className="t-small rounded-[14px] bg-warn-soft px-4 py-3 text-warn">
              Cannot send yet: {blockers.join(" and ")}.
            </p>
          )}
          {placement && (
            <div className="flex flex-wrap items-center gap-2">
              {canMoney && (
                <form action={requestPaymentDetails}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input type="hidden" name="back" value={closeHref} />
                  <SubmitButton id="panel-req-details" className={smallBtn}>
                    {inv.detailsRequestedAt ? `Details asked (${day(inv.detailsRequestedAt)}) · Ask again` : "Ask for payment details"}
                  </SubmitButton>
                </form>
              )}
              {placement.positionId && !placement.nationalityConfirmedAt && (
                <Link
                  href={`/positions/${placement.positionId}?view=offer&panel=confirm-nationality&on=${placement.id}`}
                  className={smallBtn}
                >
                  Confirm nationality
                </Link>
              )}
            </div>
          )}
          {placement && canMoney && (
            <form action={recordPaymentDetails} className="flex flex-col gap-3 rounded-[14px] border border-rule p-3.5">
              <input type="hidden" name="invoiceId" value={inv.id} />
              <input type="hidden" name="back" value={closeHref} />
              <p className="t-label text-ink">
                {placement.paymentDetails ? `Payment details recorded (${money(placement.paymentDetails.offeredSalary, inv.currency)})` : "Record client's payment details"}
              </p>
              <PanelField label={`Actual offered monthly salary (${inv.currency})`}>
                <input
                  name="offeredSalary"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={placement.paymentDetails?.offeredSalary ?? placement.monthlySalary ?? ""}
                  className={panelInput}
                />
              </PanelField>
              <PanelField label="Note (optional)">
                <input
                  name="note"
                  type="text"
                  defaultValue={placement.paymentDetails?.note ?? ""}
                  placeholder="e.g. Confirmed via email with HR"
                  className={panelInput}
                />
              </PanelField>
              <div>
                <SubmitButton id="panel-record-details" className={smallBtn}>
                  Save payment details
                </SubmitButton>
              </div>
            </form>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href={`/invoices/${inv.id}`} className={smallBtn}>Open the invoice</Link>
            {canMoney && (
              <form action={previewInvoice}>
                <input type="hidden" name="invoiceId" value={inv.id} />
                <input type="hidden" name="back" value={closeHref} />
                <SubmitButton id="panel-make" className={smallBtn}>Make the invoice to look at</SubmitButton>
              </form>
            )}
          </div>
        </PanelSection>
      )}

      {(canPay || inv.payments.length > 0) && (
        <PanelSection title="Log it here">
          {inv.payments.length > 0 && (
            <ul className="flex flex-col gap-2">
              {inv.payments.map((p, i) => (
                <li key={i} className="t-small rounded-[14px] border border-rule px-4 py-3 text-ink-2">
                  {money(p.amount, inv.currency)} · {p.method} · {day(p.paidAt)}{p.note ? " · " + p.note : ""}
                </li>
              ))}
            </ul>
          )}
          {canPay ? (
            <form action={recordPayment} className="flex flex-col gap-3.5">
              <input type="hidden" name="invoiceId" value={inv.id} />
              <input type="hidden" name="back" value={closeHref} />
              <PanelField label={`Amount received (${inv.currency})`}>
                <input name="amount" type="number" step="0.01" defaultValue={bal} required className={panelInput} />
              </PanelField>
              <PanelField label="Date received">
                <input name="receivedAt" type="date" defaultValue={colomboDate(now)} required className={panelInput} />
              </PanelField>
              <ChoiceGroup name="method" label="How it was paid" value="bank" options={[{ value: "bank", label: "Bank transfer" }, { value: "cheque", label: "Cheque" }, { value: "cash", label: "Cash" }]} />
              <PanelField label="Reference">
                <input name="reference" type="text" placeholder="Bank slip or transfer reference" className={panelInput} />
              </PanelField>
              <div><SubmitButton id="panel-pay" className={pillPrimary}>Save</SubmitButton></div>
            </form>
          ) : (
            refusal && <p className="t-small text-ink-3">{refusal}</p>
          )}
        </PanelSection>
      )}

      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">
          {inv.state === "draft"
            ? `Once you approve it, the invoice goes to ${client?.billingEmail || "the billing email"} with its PDF, and the due date (${inv.dueAt ? day(inv.dueAt) : "set at sending"}) starts to count.`
            : inv.state === "paid"
              ? "Nothing more to do. The guarantee for this hire is running."
              : `Due ${inv.dueAt ? day(inv.dueAt) : "on its date"}. A late charge of ${latePct}% a month applies after it. Reminders are copied and sent by a person.`}
        </p>
        {inv.state === "draft" && canMoney && (
          <form action={sendInvoice}>
            <input type="hidden" name="invoiceId" value={inv.id} />
            <input type="hidden" name="back" value={closeHref} />
            <SubmitButton id="panel-send" className={pillPrimary}>Approve and send</SubmitButton>
          </form>
        )}
        {inv.state !== "draft" && <div><Link href={`/invoices/${inv.id}`} className={pillSecondary}>Open the full invoice</Link></div>}
      </PanelSection>
    </Panel>
  );
}
