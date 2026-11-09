import { redirect } from "next/navigation";

import { clientsNewestFirst, desk, member as memberIn } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { clientNextStep } from "@/lib/nextStep";
import { currentMember } from "@/lib/session";

/**
 * The clients, as a table (25, section 7).
 *
 * A company we work for. The record is made when they turn out to be a client
 * the TA System already has, or when the agreement is countersigned - nobody
 * types one by hand.
 *
 * Four columns, and the same four on every list in the app: what it is and
 * what is waiting on it, its state, who owns it, when it last moved. The
 * search and the order are a plain GET form, so a search worth keeping is a
 * URL you can send somebody.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  const db = await desk();
  const rows: Listed[] = clientsNewestFirst(db).map((client) => {
    const step = clientNextStep(client, {
      positions: db.positions.filter((row) => row.clientId === client.id),
      sets: db.clientSets.filter((row) => row.clientId === client.id),
      owing: db.invoices.filter(
        (row) => row.clientId === client.id && (row.state === "sent" || row.state === "partly_paid"),
      ),
      holds: db.holds.filter((row) => row.clientId === client.id),
      // Each email once: a message copied to three of us is in three mailboxes (9 Nov).
      unanswered: new Set(db.inbound.filter((row) => row.clientId === client.id && row.readState === "new").map((row) => row.from + "|" + row.subject + "|" + row.receivedAt)).size,
    });
    const open = db.positions.filter((row) => row.clientId === client.id && row.stage !== "closed").length;
    const owing = db.invoices.filter(
      (row) => row.clientId === client.id && (row.state === "sent" || row.state === "partly_paid"),
    ).length;
    const owner = memberIn(db, client.ownerId)?.name ?? "nobody";
    return {
      id: client.id,
      href: "/clients/" + client.id,
      title: client.name,
      words: [owner, client.billingEmail, client.nameKey],
      says: step.waiting,
      at: client.updatedAt ?? client.createdAt,
      late: owing > 0,
      who: owner,
      chips: [
        { what: client.stage.replace(/_/g, " "), tone: "quiet" as const },
        ...(open ? [{ what: open + (open === 1 ? " position" : " positions"), tone: "brand" as const }] : []),
        ...(owing ? [{ what: owing === 1 ? "1 unpaid" : owing + " unpaid", tone: "late" as const }] : []),
      ],
    };
  });

  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/clients" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "No clients yet. The first one appears the moment an agreement is countersigned, or when an enquiry turns out to be a company the TA System already works for."
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
    </div>
  );
}
