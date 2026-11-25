import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { markRefunded, recordPayment } from "@/app/actions";
import { clientIn, desk, guaranteeIn, invoiceIn, invoicesNewestFirst, numberOf, placementIn, positionIn } from "@/data/desk";
import { Card, ChoiceGroup, EmptyState, PageTitle, PanelField, panelInput } from "@/app/ui/figma";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { colomboDate } from "@/lib/calendar";
import { REFUND_PCT, refundAmount } from "@/lib/guarantee";
import { dayShort as day } from "@/lib/accountsBoard";
import { balanceOf, money } from "@/lib/money";
import { closeHref, panelHref } from "@/lib/panel";
import { closeSendHref } from "@/lib/sendModal";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { AccountsSendModal } from "../AccountsSendModals";
import RefundPanel from "../RefundPanel";

export const dynamic = "force-dynamic";

const PATH = "/invoices/payment";
const smallBtn = "inline-flex cursor-pointer items-center rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";

export default async function PaymentsAndRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; msg?: string; panel?: string; send?: string; on?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  if (!can(me, "money.manage")) {
    redirect("/invoices?msg=" + encodeURIComponent("Only accounts can log payments."));
  }

  const sp = await searchParams;
  const db = await desk();
  const now = Date.now();
  const canMoney = can(me, "money.manage");
  const open = invoicesNewestFirst(db).filter(
    (i) => i.kind !== "credit_note" && i.state !== "paid" && i.state !== "written_off" && i.state !== "draft" && balanceOf(i) > 0,
  );
  const selected = sp.invoiceId ? invoiceIn(db, sp.invoiceId) : open.length === 1 ? open[0] : null;
  const selectedClient = selected?.clientId ? clientIn(db, selected.clientId) : null;

  // Refunds: decided by the Director while a replacement is being looked for, then paid by accounts.
  const toDecide = db.guarantees.filter((g) => g.state === "replacing");
  const toPay = db.guarantees.filter((g) => g.state === "refund_pending");
  const director = db.members.find((m) => m.active && m.role === "director_ops");
  const directorFirst = (director?.name ?? "the Director").replace(/^Mr\.?\s+/i, "Mr ");
  const waited = (at: number | null) => (at ? Math.max(0, Math.floor((now - at) / 86_400_000)) : 0);
  const refundCount = toDecide.length + toPay.length;

  const pct = numberOf(db, "refund.pct", REFUND_PCT);
  const close = closeHref(PATH, sp);
  const openGuarantee = sp.panel === "refund-decision" && sp.on ? guaranteeIn(db, sp.on) : null;

  const card = (g: (typeof db.guarantees)[number], pay: boolean) => {
    const placement = placementIn(db, g.placementId);
    const client = g.clientId ? clientIn(db, g.clientId) : placement?.clientId ? clientIn(db, placement.clientId) : null;
    const role = placement?.positionId ? positionIn(db, placement.positionId)?.title : null;
    const inv = placement?.invoiceId ? invoiceIn(db, placement.invoiceId) : null;
    const paid = inv ? inv.payments.reduce((s, p) => s + p.amount, 0) : 0;
    const amount = pay ? g.refundAmount ?? 0 : refundAmount(paid, pct);
    return (
      <div key={g.id} className="flex min-w-0 flex-col gap-1.5 rounded-[16px] bg-sunk p-3.5">
        <p className="t-body-m">{[client?.name, role].filter(Boolean).join(" > ") || g.candidateName}</p>
        <p className="t-small text-ink-3">
          {g.candidateName}{g.leftAt ? " left " + day(g.leftAt) : ""}
        </p>
        <p className="text-[16px] font-medium leading-6">{money(amount, inv?.currency ?? "LKR")}</p>
        <p className="t-small text-warn">
          {pay
            ? "Refund to pay" + (g.decidedAt ? ", decided " + day(g.decidedAt) : "")
            : g.deadlineAt && g.deadlineAt < now
              ? `Waits for ${directorFirst}, ${waited(g.deadlineAt)} day${waited(g.deadlineAt) === 1 ? "" : "s"}`
              : `Replacement window open until ${day(g.deadlineAt)}`}
        </p>
        <div className="pt-1">
          {pay ? (
            canMoney && (
              <form action={markRefunded}>
                <input type="hidden" name="guaranteeId" value={g.id} />
                <input type="hidden" name="back" value={close} />
                <SubmitButton id={"paid-" + g.id} className={smallBtn}>Refund paid</SubmitButton>
              </form>
            )
          ) : (
            <Link href={panelHref(PATH, sp, "refund-decision", g.id)} scroll={false} className={smallBtn}>Record his answer</Link>
          )}
        </div>
      </div>
    );
  };

  const heading = (title: string, n: number) => (
    <div className="flex items-center gap-2.5 px-1 pt-1.5">
      <span className="size-2 rounded-[4px] bg-warn" />
      <h3 className="t-body-m">{title}</h3>
      <span className="t-small text-ink-3">{n}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Payments and refunds"
        sub={`${toDecide.length} refund${toDecide.length === 1 ? "" : "s"} wait${toDecide.length === 1 ? "s" : ""} for ${directorFirst} · ${toPay.length} to pay`}
      />
      {sp.msg && !openGuarantee && <p role="status" className="t-body rounded-[18px] bg-brand-tint px-4 py-3">{sp.msg}</p>}

      <div className="grid grid-cols-1 items-start gap-[22px] pg-xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Payments and refunds" sub="Match each payment. Record each answer.">
          {heading("Payments to match", 0)}
          <EmptyState icon="wallet" title="No payments to match">
            Not connected yet: a bank feed. Until it is, record each payment against its invoice with the form on the right.
          </EmptyState>

          {heading("Refunds", refundCount)}
          {refundCount === 0 ? (
            <EmptyState icon="shield" title="No refunds waiting">
              A refund appears here when somebody leaves inside the guarantee and no replacement is placed.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {toDecide.map((g) => card(g, false))}
              {toPay.map((g) => card(g, true))}
            </div>
          )}
        </Card>

        <aside className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
            <p className="t-micro flex items-center gap-2 text-ink-3"><Icon name="sparkle" size={16} />Where it stands</p>
            <p className="text-[20px] font-medium leading-7 text-surface">
              {open.length} open invoice{open.length === 1 ? "" : "s"}, {refundCount} refund{refundCount === 1 ? "" : "s"}.
            </p>
            <p className="t-small text-ink-3">
              {toDecide[0]?.deadlineAt && toDecide[0].deadlineAt < now
                ? `The ${(clientIn(db, toDecide[0].clientId ?? "")?.name ?? "oldest")} refund has waited ${waited(toDecide[0].deadlineAt)} day${waited(toDecide[0].deadlineAt) === 1 ? "" : "s"} for ${directorFirst}.`
                : "Nothing is waiting on a decision."}
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
            <p className="t-micro text-ink-3">Record a payment</p>
            {!canMoney ? (
              <p className="t-small text-ink-3">Only accounts record payments.</p>
            ) : !selected ? (
              open.length === 0 ? (
                <p className="t-small text-ink-3">There are no sent invoices waiting for payment.</p>
              ) : (
                <>
                  <p className="t-small text-ink-3">Choose the invoice it pays.</p>
                  <ul className="flex flex-col gap-1.5">
                    {open.map((i) => (
                      <li key={i.id}>
                        <Link href={{ pathname: PATH, query: { invoiceId: i.id } }} className="flex items-center justify-between gap-3 rounded-[14px] border border-rule px-4 py-3 hover:bg-sunk">
                          <span className="t-body min-w-0 truncate">{i.number} · {(i.clientId ? clientIn(db, i.clientId)?.name : null) ?? "Client"}</span>
                          <span className="t-small shrink-0 text-ink-3">{money(balanceOf(i), i.currency)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : (
              <form action={recordPayment} className="flex flex-col gap-3.5">
                <input type="hidden" name="invoiceId" value={selected.id} />
                <input type="hidden" name="back" value={PATH} />
                <PanelField label="Invoice">
                  <div className="flex items-center gap-2 rounded-[14px] border border-rule px-4 py-3">
                    <span className="t-body min-w-0 flex-1 truncate">{selected.number} · {selectedClient?.name ?? "Client"}</span>
                    {open.length > 1 && <Link href={PATH} className="t-small text-ink underline">Change</Link>}
                  </div>
                </PanelField>
                <PanelField label={`Amount (${selected.currency})`} hint={`Owed: ${money(balanceOf(selected), selected.currency)}`}>
                  <input name="amount" type="number" step="0.01" defaultValue={balanceOf(selected)} required className={panelInput} />
                </PanelField>
                <PanelField label="Date">
                  <input name="receivedAt" type="date" defaultValue={colomboDate(now)} required className={panelInput} />
                </PanelField>
                <PanelField label="How">
                  <ChoiceGroup name="method" label="How it was paid" value="bank" options={[{ value: "bank", label: "Bank" }, { value: "cheque", label: "Cheque" }, { value: "cash", label: "Cash" }]} />
                </PanelField>
                <PanelField label="Reference">
                  <input name="reference" type="text" placeholder="Bank slip or transfer reference" className={panelInput} />
                </PanelField>
                <div>
                  <SubmitButton id="record-payment" className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-[18px] py-[11px] text-[14px] font-medium leading-[22px] text-ink-inverse">
                    <Icon name="check" size={16} />Record
                  </SubmitButton>
                </div>
              </form>
            )}
          </section>
        </aside>
      </div>

      {openGuarantee && (
        <RefundPanel
          db={db}
          g={openGuarantee}
          now={now}
          me={me}
          director={director ?? null}
          pct={pct}
          closeHref={close}
          msg={sp.msg}
        />
      )}
      {sp.send && (
        <AccountsSendModal send={sp.send} on={sp.on} db={db} me={me} closeHref={closeSendHref(PATH, sp)} />
      )}
    </div>
  );
}
