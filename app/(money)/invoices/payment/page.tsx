import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/app/Icon";
import { recordPayment } from "@/app/actions";
import { clientIn, desk, invoiceIn, invoicesNewestFirst } from "@/data/desk";
import {
  BackBar,
  PageBox,
  figmaField,
  figmaLabel,
  pillPrimary,
  pillSecondary,
} from "@/app/ui/figma";
import { day } from "@/lib/listing";
import { balanceOf, money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  if (!can(me, "money.manage")) {
    redirect("/invoices?msg=" + encodeURIComponent("Only accounts can log payments."));
  }

  const sp = await searchParams;
  const db = await desk();
  const openInvoices = invoicesNewestFirst(db).filter(
    (inv) =>
      inv.kind !== "credit_note" &&
      inv.state !== "paid" &&
      inv.state !== "written_off" &&
      balanceOf(inv) > 0,
  );
  const selected = sp.invoiceId
    ? invoiceIn(db, sp.invoiceId)
    : openInvoices.length === 1
      ? openInvoices[0]
      : null;

  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);

  return (
    <PageBox width="880">
      <div className="flex flex-col gap-6">
        <BackBar href="/invoices" label="Finance" />

        <div>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">
            Log a payment
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Payments stay with their invoice, so the history is always in one place.
          </p>
        </div>

        {sp.msg && (
          <div className="rounded-[18px] border border-brand/25 bg-brand-tint px-4 py-3 text-[13px] font-medium text-ink">
            {sp.msg}
          </div>
        )}

        {!selected ? (
          <div className="rounded-[24px] border border-rule bg-surface p-5">
            <div className="mb-3 text-[12px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-faint">
              Choose an open invoice
            </div>
            {openInvoices.length === 0 ? (
              <p className="text-[14px] text-ink-soft">
                There are no open invoices waiting for payment.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {openInvoices.map((inv) => {
                  const client = inv.clientId ? clientIn(db, inv.clientId) : null;
                  const bal = balanceOf(inv);
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/payment?invoiceId=${encodeURIComponent(inv.id)}`}
                      className="flex items-center justify-between gap-4 rounded-[14px] px-3 py-3 transition hover:bg-sunk/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink-soft">
                          <Icon name="wallet" size={16} />
                        </span>
                        <div>
                          <div className="text-[14px] font-medium text-ink">
                            {inv.number} · {client?.name ?? "Client"}
                          </div>
                          <div className="text-[12px] text-ink-soft">
                            {money(bal, inv.currency)}
                            {inv.dueAt ? ` · due ${day(inv.dueAt)}` : ""}
                          </div>
                        </div>
                      </div>
                      <Icon name="chevron-right" size={16} className="text-ink-faint" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          (() => {
            const client = selected.clientId ? clientIn(db, selected.clientId) : null;
            const bal = balanceOf(selected);
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-[1.5px] border-success bg-brand-tint p-4">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-brand">
                      <Icon name="wallet" size={18} />
                    </span>
                    <div>
                      <div className="text-[16px] font-medium leading-[26px] text-ink">
                        {selected.number} · {client?.name ?? "Client"}
                      </div>
                      <div className="text-[14px] leading-[21px] text-ink-faint">
                        {money(bal, selected.currency)}
                        {selected.dueAt ? ` · due ${day(selected.dueAt)}` : ""}
                      </div>
                    </div>
                  </div>
                  {openInvoices.length > 1 && (
                    <Link href="/invoices/payment" className="px-3 text-[14px] leading-[21px] text-ink underline">
                      Change
                    </Link>
                  )}
                </div>

                <div>
                  <form action={recordPayment} className="flex flex-col gap-5">
                    <input type="hidden" name="invoiceId" value={selected.id} />
                    <input type="hidden" name="back" value={`/invoices/${selected.id}`} />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={figmaLabel} htmlFor="amount">
                          Amount received ({selected.currency})
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
                          Date
                        </label>
                        <input
                          id="receivedAt"
                          name="receivedAt"
                          type="date"
                          defaultValue={todayIso}
                          required
                          className={figmaField}
                        />
                      </div>
                    </div>

                    <div>
                      <div className={figmaLabel}>How it was paid</div>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {[
                          { value: "bank", label: "Bank transfer" },
                          { value: "cheque", label: "Cheque" },
                          { value: "cash", label: "Cash" },
                        ].map((opt, idx) => (
                          <label
                            key={opt.value}
                            className="inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-[14px] leading-[21px] text-ink-soft has-[:checked]:bg-sunk has-[:checked]:font-medium has-[:checked]:text-ink"
                          >
                            <input
                              type="radio"
                              name="method"
                              value={opt.value}
                              defaultChecked={idx === 0}
                              className="sr-only"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={figmaLabel} htmlFor="reference">
                        Reference
                      </label>
                      <input
                        id="reference"
                        name="reference"
                        type="text"
                        placeholder="Bank slip or transfer reference"
                        className={figmaField}
                      />
                    </div>

                    <div className="flex items-center gap-2.5 rounded-[16px] bg-brand-soft px-4 py-3 text-[14px] leading-[21px] text-ink">
                      <Icon name="check" size={16} className="shrink-0 text-success" />
                      Saving this payment updates {selected.number} immediately and records it in the
                      invoice history.
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="submit" className={pillPrimary}>
                        Save payment
                      </button>
                      <Link href="/invoices" className="px-4 py-2 text-[16px] leading-[26px] text-ink-soft hover:text-ink">
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              </>
            );
          })()
        )}
      </div>
    </PageBox>
  );
}
