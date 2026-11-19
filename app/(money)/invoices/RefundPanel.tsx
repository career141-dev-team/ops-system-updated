import Link from "next/link";
import Icon from "@/app/Icon";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { Avatar, ChoicePill, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import { clientIn, invoiceIn, placementIn, positionIn } from "@/data/desk";
import type { OpsDatabase, OpsGuarantee, OpsMember } from "@/data/types";
import { colomboDate } from "@/lib/calendar";
import { REPLACEMENT_WORKING_DAYS, refundAmount } from "@/lib/guarantee";
import { dayShort as day } from "@/lib/accountsBoard";
import { money } from "@/lib/money";
import { can } from "@/lib/roles";
import CopyButton from "./CopyButton";
import { decideRefundWithAnswer } from "./panelActions";

const smallBtn = "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";

/** The refund-decision panel (v6 A2 state, 187:330): the request, who decides, and his answer recorded. */
export default function RefundPanel({
  db,
  g,
  now,
  me,
  director,
  pct,
  closeHref,
  msg,
}: {
  db: OpsDatabase;
  g: OpsGuarantee;
  now: number;
  me: OpsMember;
  director: OpsMember | null;
  pct: number;
  closeHref: string;
  msg?: string;
}) {
  const placement = placementIn(db, g.placementId);
  const client = g.clientId ? clientIn(db, g.clientId) : placement?.clientId ? clientIn(db, placement.clientId) : null;
  const role = placement?.positionId ? positionIn(db, placement.positionId)?.title : null;
  const inv = placement?.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
  const paid = inv ? inv.payments.reduce((s, p) => s + p.amount, 0) : 0;
  const currency = inv?.currency ?? "LKR";
  const amount = refundAmount(paid, pct);
  const name = director?.name ?? "the Director of Operations";
  const windowOpen = Boolean(g.deadlineAt && g.deadlineAt > now);
  const decidable = g.state === "replacing";
  const mayDecide = can(me, "refund.decide");

  const why = [
    g.deadlineAt
      ? windowOpen
        ? `The ${REPLACEMENT_WORKING_DAYS}-working-day replacement window is open until ${day(g.deadlineAt)}`
        : `No replacement was placed within ${REPLACEMENT_WORKING_DAYS} working days, which ended ${day(g.deadlineAt)}`
      : null,
    `The ${pct}% refund is ${money(amount, currency)} (of ${money(paid, currency)} paid). Only ${name} decides it`,
    g.state === "refund_pending" ? "A refund has been decided already" : null,
  ].filter(Boolean) as string[];

  const email =
    `${name}, ${client?.name ?? "the client"} asks for a refund. ${g.candidateName}` +
    `${g.leftAt ? " left on " + day(g.leftAt) : " left"}, within the guarantee. ` +
    `No replacement was placed in ${REPLACEMENT_WORKING_DAYS} working days. The ${pct}% refund is ${money(amount, currency)}. ` +
    "Please tell us: yes, another amount, or no.";

  return (
    <Panel
      kicker="Refund decision"
      title={`Refund for ${client?.name ?? g.candidateName}`}
      sub={[client?.name, role, g.candidateName + (g.leftAt ? " left " + day(g.leftAt) : ""), `Refund ${pct}% of ${money(paid, currency)}`].filter(Boolean).join(" > ")}
      closeHref={closeHref}
    >
      {msg && <p role="status" className="t-body mb-4 rounded-[14px] bg-brand-tint px-4 py-3">{msg}</p>}

      <PanelSection title="Why now">
        <ul className="flex flex-col gap-2">
          {why.map((w) => (
            <li key={w} className="t-body flex gap-2.5 text-ink-2"><span className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />{w}</li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Who and how">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="40" tone="neutral" />
          <div className="min-w-0">
            <p className="t-body-m">{name}</p>
            <p className="t-small text-ink-3">Decides refunds by email only{director?.email ? " · " + director.email : ""}</p>
          </div>
        </div>
        {director?.email && (
          <div className="flex flex-wrap gap-2">
            <a href={"mailto:" + director.email} className={smallBtn}><Icon name="mail" size={14} />Email</a>
            <CopyButton text={director.email} label="Copy email" />
          </div>
        )}
        <PanelField label="Email to copy">
          <p className="t-body rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={email} label="Copy the email" />
            <Link href={`/invoices/payment?send=ask-refund&on=${g.id}`} scroll={false} className={smallBtn}>
              <Icon name="send" size={14} /> Preview and send
            </Link>
          </div>
          <p className="t-small text-ink-3">Nothing is sent from here until you approve in Preview and send.</p>
        </PanelField>
      </PanelSection>

      <PanelSection title="Log it here">
        {!decidable ? (
          <p className="t-body text-ink-2">
            {g.state === "refund_pending" ? "His answer is recorded. Press Refund paid on the Payments page once it is paid." : "A refund is only decided while we are trying to replace somebody."}
          </p>
        ) : (
          <form action={decideRefundWithAnswer} className="flex flex-col gap-4">
            <input type="hidden" name="guaranteeId" value={g.id} />
            <input type="hidden" name="back" value={closeHref} />
            <PanelField label="Record his answer">
              <div className="flex flex-wrap gap-2">
                <ChoicePill name="answer" value="yes" label={`Yes, ${pct}% = ${money(amount, currency)}`} defaultChecked required />
                <span aria-disabled="true" className="inline-flex items-center rounded-full border border-rule px-4 py-[9px] text-[14px] font-medium leading-[22px] text-ink-3">Other amount</span>
                <span aria-disabled="true" className="inline-flex items-center rounded-full border border-rule px-4 py-[9px] text-[14px] font-medium leading-[22px] text-ink-3">No</span>
              </div>
              <span className="t-small text-ink-3">Not connected yet: another amount, and a No answer. Only the {pct}% decision is saved today.</span>
            </PanelField>
            <PanelField label="Date of his answer">
              <input name="answeredOn" type="date" defaultValue={colomboDate(now)} max={colomboDate(now)} required className={panelInput} />
            </PanelField>
            <PanelField label="His words">
              <textarea name="words" rows={3} required placeholder="Paste his reply from the email" className={panelInput} />
            </PanelField>
            {windowOpen && (
              <label className="t-body flex items-start gap-2.5 text-ink-2">
                <input type="checkbox" name="early" className="mt-1 size-4" />
                Decide before the replacement window is up. It is written down as an early decision.
              </label>
            )}
            <div className="flex flex-col gap-3 border-t border-rule pt-[22px]">
              <h3 className="t-micro text-ink-3">What happens next</h3>
              <p className="t-body text-ink-2">
                A line &ldquo;Refund to pay&rdquo; appears under Payments. When it has been paid, open it and press &ldquo;Refund paid&rdquo;, and the position can be closed.
              </p>
              {!mayDecide && <p className="t-small text-danger">Only {name} records the refund decision. Ask the Director to record it, or paste his answer in once he has signed in.</p>}
              <div>
                {mayDecide ? (
                  <SubmitButton id="panel-refund" className={pillPrimary}>Save</SubmitButton>
                ) : (
                  <button type="button" disabled className={pillPrimary + " opacity-50"}>Save</button>
                )}
              </div>
            </div>
          </form>
        )}
      </PanelSection>
    </Panel>
  );
}
