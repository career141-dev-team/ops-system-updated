import { redirect } from "next/navigation";

import { clientsNewestFirst, desk, leadsNewestFirst, member as memberIn, positionsNewestFirst } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { currentMember } from "@/lib/session";

/**
 * One box that finds anything (25, section 7).
 *
 * A person knows the client's name, not which of eight places the thing is
 * filed under. So this looks in all of them at once - enquiries, clients,
 * positions, CV sets, interviews, placements and invoices - and says what
 * kind each row is.
 *
 * The same search rule as every list page, so what it finds here and what a
 * list finds there are the same thing.
 */
export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { q, sort } = await searchParams;

  const db = await desk();
  const who = (id: string) => memberIn(db, id)?.name ?? "nobody";
  const rows: Listed[] = [];

  for (const lead of leadsNewestFirst(db)) {
    rows.push({
      id: "lead:" + lead.id,
      href: "/leads/" + lead.id,
      title: lead.company,
      words: [who(lead.ownerId), lead.contactEmail ?? "", lead.source],
      says: "An enquiry, " + lead.state.replace(/_/g, " "),
      at: lead.createdAt,
      late: false,
      who: who(lead.ownerId),
      chips: [{ what: "enquiry", tone: "quiet" }],
    });
  }

  for (const client of clientsNewestFirst(db)) {
    rows.push({
      id: "client:" + client.id,
      href: "/clients/" + client.id,
      title: client.name,
      words: [who(client.ownerId), client.billingEmail, client.nameKey],
      says: "A client, " + client.stage,
      at: client.updatedAt ?? client.createdAt,
      late: false,
      who: who(client.ownerId),
      chips: [{ what: "client", tone: "brand" }],
    });
  }

  for (const position of positionsNewestFirst(db)) {
    rows.push({
      id: "position:" + position.id,
      href: "/positions/" + position.id,
      title: position.title,
      words: [who(position.ownerId), position.clientTaId, position.openingTaId ?? ""],
      says: "A position, " + position.stage.replace(/_/g, " "),
      at: position.updatedAt ?? position.createdAt,
      late: false,
      who: who(position.ownerId),
      chips: [{ what: "position", tone: "quiet" }],
    });
  }

  for (const set of db.clientSets) {
    rows.push({
      id: "set:" + set.id,
      href: "/sets/" + set.id,
      title: set.name,
      words: [who(set.ownerId), set.openingTaId, set.role],
      says: "A CV set, " + set.state,
      at: set.updatedAt ?? set.createdAt,
      late: false,
      who: who(set.ownerId),
      chips: [{ what: "CV set", tone: "quiet" }],
    });
  }

  for (const interview of db.interviews) {
    rows.push({
      id: "interview:" + interview.id,
      href: "/interviews/" + interview.id,
      title: interview.candidateName,
      words: [who(interview.ownerId), interview.openingTaId, interview.applicationTaId],
      says: "An interview, round " + interview.round + ", " + interview.state,
      at: interview.at ?? interview.createdAt,
      late: false,
      who: who(interview.ownerId),
      chips: [{ what: "interview", tone: "quiet" }],
    });
  }

  for (const placement of db.placements) {
    rows.push({
      id: "placement:" + placement.id,
      href: "/placements/" + placement.id,
      title: placement.candidateName,
      words: [who(placement.ownerId), placement.openingTaId, placement.placementTaId],
      says: "A placement, " + placement.state.replace(/_/g, " "),
      at: placement.updatedAt ?? placement.createdAt,
      late: false,
      who: who(placement.ownerId),
      chips: [{ what: "placement", tone: "quiet" }],
    });
  }

  for (const invoice of db.invoices) {
    rows.push({
      id: "invoice:" + invoice.id,
      href: "/invoices/" + invoice.id,
      title: invoice.number,
      words: [who(invoice.ownerId), invoice.kind, invoice.about ?? ""],
      says: "An invoice, " + invoice.state,
      at: invoice.sentAt ?? invoice.createdAt,
      late: false,
      who: who(invoice.ownerId),
      chips: [{ what: "invoice", tone: "quiet" }],
    });
  }

  const asked = (q ?? "").trim();
  const shown = asked ? listed(rows, q, sort) : [];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-[18px] font-medium leading-tight">Find</h1>
        <p className="mt-1 max-w-[80ch] text-[12.5px] text-ink-soft">
          One box over everything this desk keeps: enquiries, clients, positions, CV sets, interviews, placements and
          invoices. Type part of a name, a number, or the person who owns it.
        </p>
      </div>

      <Toolbar
        action="/find"
        q={q}
        sort={sort}
        sorts={SORTS}
        found={asked ? foundInWords(shown.length, rows.length, q) : rows.length + " things to search"}
      />

      {!asked ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          Type something above. The search looks at the name, the one-line summary, the client and the owner - so a
          company name finds their enquiry, their positions, their sets and their invoices at once.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {foundInWords(0, rows.length, q)}
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
            />
          ))}
        </Table>
      )}
    </div>
  );
}
