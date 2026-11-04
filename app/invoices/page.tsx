import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, invoicesNewestFirst, runClocks } from "@/data/desk";
import { invoiceDrift } from "@/lib/exports";
import { balanceOf, invoiceInWords, money } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * Invoices (15, Phase 6).
 *
 * Four lists in the order money matters: waiting for accounts, out and late,
 * out and not due yet, and settled. The late ones are first because that is
 * the only list anybody has to act on.
 */
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = invoicesNewestFirst(db);
  const drafts = all.filter((i) => i.state === "draft");
  const owing = all.filter((i) => (i.state === "sent" || i.state === "partly_paid") && balanceOf(i) > 0);
  const late = owing.filter((i) => i.dueAt && i.dueAt < now);
  const waiting = owing.filter((i) => !i.dueAt || i.dueAt >= now);
  const settled = all.filter((i) => i.state === "paid" || i.state === "written_off");
  const owed = owing.reduce((sum, i) => sum + balanceOf(i), 0);
  // Where our state and TA's may have drifted apart (Phase 6 step 19).
  const drift = invoiceDrift(all, db.outbox);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((invoice) => (
        <div key={invoice.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/invoices/" + invoice.id} className="text-[13.5px] text-brand hover:underline">
              {invoice.number}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {invoiceInWords(invoice, now)}
              {invoice.disputed && " · disputed, so nothing is charged"}
            </p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Invoices</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A fee is drafted the day the person joins and is due thirty days from their first working day. Late adds 1% a
          month, compounded — and nothing at all on an invoice the client disputes in good faith, which is the
          agreement&rsquo;s own wording.
        </p>
        {owed > 0 && (
          <p className="mt-2 text-[13px]">
            {money(owed, owing[0]?.currency ?? "LKR")} outstanding across {owing.length}{" "}
            {owing.length === 1 ? "invoice" : "invoices"}.
          </p>
        )}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {drift.length > 0 && (
        <section className="rounded-2xl border border-warning bg-surface px-5 py-4">
          <h2 className="text-[14.5px] font-medium">The TA System may not know</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-ink-soft">
            TA&rsquo;s own closing checklist reads the invoice state, so a write that never got through means they
            think nothing was billed. The{" "}
            <Link href="/ta" className="text-brand hover:underline">
              TA System screen
            </Link>{" "}
            is where a stuck write is pushed again.
          </p>
          {drift.map((row) => (
            <p key={row.number} className="mt-2 text-[13px]">
              {row.number} — <span className="text-ink-soft">{row.what}</span>
            </p>
          ))}
        </section>
      )}

      {list("Late", late, "Nothing is late.")}
      {list("Waiting for accounts", drafts, "Nothing waiting to be sent.")}
      {list("Sent, not due yet", waiting, "Nothing outstanding.")}
      {settled.length > 0 && list("Settled", settled, "")}

      {can(me, "money.manage") && (
        <p className="text-[12.5px] text-ink-soft">
          For accounts, as a file:{" "}
          <a href="/api/exports/invoices.csv" className="text-brand hover:underline">
            every invoice
          </a>{" "}
          ·{" "}
          <a href="/api/exports/payments.csv" className="text-brand hover:underline">
            every payment
          </a>
          . One row per thing, checkable line by line against the bank.
        </p>
      )}
    </div>
  );
}
