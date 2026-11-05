import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, invoicesNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
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
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = invoicesNewestFirst(db);
  const owing = all.filter((i) => (i.state === "sent" || i.state === "partly_paid") && balanceOf(i) > 0);
  const owed = owing.reduce((sum, i) => sum + balanceOf(i), 0);
  // Where our state and TA's may have drifted apart (Phase 6 step 19).
  const drift = invoiceDrift(all, db.outbox);

  // One table, ordered by what is late (25, section 7). The four lists it
  // replaced said the same thing in four boxes; a column of states says it
  // once and lets a person sort it themselves.
  const rows: Listed[] = all.map((invoice) => {
    const owner = memberIn(db, invoice.ownerId)?.name ?? "nobody";
    const balance = balanceOf(invoice);
    return {
      id: invoice.id,
      href: "/invoices/" + invoice.id,
      title: invoice.number,
      words: [owner, invoice.kind, invoice.about ?? "", invoice.state],
      says: invoiceInWords(invoice, now) + (invoice.disputed ? " · disputed, so nothing is charged" : ""),
      at: invoice.sentAt ?? invoice.createdAt,
      late: Boolean(invoice.dueAt && invoice.dueAt < now && balance > 0),
      who: owner,
      chips: [
        { what: invoice.state, tone: invoice.state === "paid" ? ("done" as const) : ("quiet" as const) },
        ...(invoice.kind === "fee" ? [] : [{ what: invoice.kind, tone: "quiet" as const }]),
        ...(balance > 0 ? [{ what: money(balance, invoice.currency) + " owed", tone: "brand" as const }] : []),
        ...(invoice.lateCharge ? [{ what: money(invoice.lateCharge, invoice.currency) + " late charge", tone: "late" as const }] : []),
        ...(invoice.disputed ? [{ what: "disputed", tone: "careful" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[14.5px] font-medium">Invoices</h2>
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

      <Toolbar action="/invoices" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nothing has been invoiced yet. A fee is drafted the day somebody joins, from the agreement's own rule, and appears here with the thirty days it is due in."
            : foundInWords(0, rows.length, q)}
        </p>
      ) : (
        <Table head={LIST_HEAD}>
          {shown.map((row) => (
            <ListRow
              key={row.id}
              href={row.href}
              title={row.title}
              says={row.says}
              chips={row.chips}
              who={row.who}
              when={day(row.at)}
              late={row.late}
            />
          ))}
        </Table>
      )}

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
