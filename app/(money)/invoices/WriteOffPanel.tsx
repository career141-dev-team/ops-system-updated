import Icon from "@/app/Icon";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import { clientIn, placementIn, positionIn } from "@/data/desk";
import type { OpsDatabase, OpsInvoice, OpsMember } from "@/data/types";
import { dayShort as day } from "@/lib/accountsBoard";
import { balanceOf, money, problemWithWriteOff } from "@/lib/money";
import { can } from "@/lib/roles";
import { writeOffWithReason } from "./panelActions";

const smallBtn = "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";

/** The write-off panel (v6 A1 state, 187:418): why now, who to call once more, the reason, and the one Save. */
export default function WriteOffPanel({
  db,
  inv,
  now,
  me,
  closeHref,
  msg,
  writeOffDays,
}: {
  db: OpsDatabase;
  inv: OpsInvoice;
  now: number;
  me: OpsMember;
  closeHref: string;
  msg?: string;
  writeOffDays: number;
}) {
  const client = inv.clientId ? clientIn(db, inv.clientId) : null;
  const placement = inv.placementId ? placementIn(db, inv.placementId) : null;
  const role = placement?.positionId ? positionIn(db, placement.positionId)?.title : null;
  const days = inv.dueAt ? Math.floor((now - inv.dueAt) / 86_400_000) : 0;
  const contact =
    client?.contacts?.find((c) => /financ|account|billing/i.test(c.role)) ??
    client?.contacts?.[0] ??
    (client?.billingEmail ? { name: client.billingName, email: client.billingEmail, phone: "", role: "Billing" } : null);
  const closed = inv.state === "paid" || inv.state === "written_off" || inv.kind === "credit_note";
  const allowed = can(me, "refund.decide") || can(me, "money.manage");
  // The same 30-day rule the action applies; only the Director may go earlier. The reason is checked there.
  const tooSoon = inv.dueAt ? problemWithWriteOff(inv.dueAt, "enough", now, writeOffDays) : null;
  const blocked = closed ? "This invoice is closed already." : !allowed ? "Only accounts or the Director can write an invoice off." : tooSoon && !can(me, "refund.decide") ? tooSoon : null;
  const history = db.audit.filter((e) => e.subjectType === "invoice" && e.subjectId === inv.id).sort((a, b) => a.at - b.at);
  const digits = (contact?.phone ?? "").replace(/[^0-9]/g, "");

  const why = [
    inv.dueAt ? `The invoice was due on ${day(inv.dueAt)} and is ${Math.max(0, days)} day${days === 1 ? "" : "s"} late` : null,
    `Late charge so far: ${money(inv.lateCharge, inv.currency)}${inv.lateMonths > 0 ? `, ${inv.lateMonths} month${inv.lateMonths === 1 ? "" : "s"}` : ""}. Still owed: ${money(balanceOf(inv), inv.currency)}`,
    history.length > 0 ? "Recorded: " + history.map((e) => `${e.action} ${day(e.at)}`).join(", ") : "No chasing is recorded on this invoice",
  ].filter(Boolean) as string[];

  return (
    <Panel
      kicker="Write off"
      title={`Write off invoice ${inv.number}`}
      sub={[client?.name, role, money(inv.amount, inv.currency), inv.dueAt ? "Due " + day(inv.dueAt) : null].filter(Boolean).join(" > ")}
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
              {digits && <a href={"https://wa.me/" + digits} target="_blank" rel="noopener noreferrer" className={smallBtn}><Icon name="chat" size={14} />WhatsApp</a>}
              {contact.email && <a href={"mailto:" + contact.email} className={smallBtn}><Icon name="mail" size={14} />Email</a>}
            </div>
          </>
        ) : (
          <p className="t-small text-ink-3">No billing contact on the client record yet.</p>
        )}
        <PanelField label="Last call before writing off">
          <p className="t-body text-ink-2">We are about to close this invoice. Can you pay this week, or pay part of it?</p>
        </PanelField>
      </PanelSection>

      <PanelSection title="Log it here">
        <form action={writeOffWithReason} className="flex flex-col gap-4">
          <input type="hidden" name="invoiceId" value={inv.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelField label="Reason">
            <ChoiceGroup
              name="kind"
              label="Reason"
              required
              options={[
                { value: "closed", label: "Client closed down" },
                { value: "refuses", label: "Client refuses to pay" },
                { value: "unreachable", label: "Cannot reach the client" },
                { value: "disputed", label: "Disputed the fee" },
                { value: "other", label: "Other" },
              ]}
            />
            <input name="other" type="text" placeholder="If Other, write it here" className={panelInput} />
          </PanelField>
          <PanelField label="Note">
            <textarea name="note" rows={2} placeholder="What was tried, and what the client said" className={panelInput} />
          </PanelField>
          <PanelField label="After this, the client">
            <label className="t-body flex items-center gap-2.5 text-ink-2">
              <input type="checkbox" name="markDormant" className="size-4" />
              Mark this client as dormant (unchecked = stays active with us)
            </label>
          </PanelField>
          <div className="flex flex-col gap-3 border-t border-rule pt-[22px]">
            <h3 className="t-micro text-ink-3">What happens next</h3>
            <p className="t-body text-ink-2">
              The invoice is closed as written off and the guarantee for this hire goes void. The client stays active. A reason is required and is kept with the invoice.
            </p>
            {blocked && <p className="t-small text-danger">{blocked}</p>}
            <div>
              {blocked ? (
                <button type="button" disabled className={pillPrimary + " opacity-50"}>Save</button>
              ) : (
                <SubmitButton id="panel-writeoff" className={pillPrimary}>Save</SubmitButton>
              )}
            </div>
          </div>
        </form>
      </PanelSection>
    </Panel>
  );
}
