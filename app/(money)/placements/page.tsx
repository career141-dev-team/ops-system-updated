import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, member as memberIn, placementsNewestFirst, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { money, placementInWords } from "@/lib/money";
import { currentMember } from "@/lib/session";

/**
 * Placements (15, Phase 6).
 *
 * The TA System makes the placement; this is the part that pays for
 * everything. Three lists: who is joining, who has joined, and the ones that
 * never happened. Nothing here is typed in from scratch — a placement arrives
 * from TA's own event the day it is made, which is the whole point of it.
 */
export default async function PlacementsPage({
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
  const all = placementsNewestFirst(db);
  const rows: Listed[] = all.map((placement) => {
    const owner = memberIn(db, placement.ownerId)?.name ?? "nobody";
    return {
      id: placement.id,
      href: "/placements/" + placement.id,
      title: placement.candidateName,
      words: [owner, placement.openingTaId, placement.placementTaId, placement.state],
      says:
        placementInWords(placement, now) +
        (placement.monthlySalary
          ? " · " + money(placement.monthlySalary, placement.currency) + " a month"
          : " · no package yet"),
      at: placement.joinedAt ?? placement.joinDate ?? placement.createdAt,
      late: placement.state === "placed" && Boolean(placement.joinDate && placement.joinDate < now),
      who: owner,
      chips: [
        { what: placement.state.replace(/_/g, " "), tone: placement.state === "joined" ? ("done" as const) : ("quiet" as const) },
        ...(placement.isReplacementOf ? [{ what: "replacement", tone: "brand" as const }] : []),
        ...(placement.invoiceId ? [] : placement.joinedAt ? [{ what: "no fee drafted", tone: "late" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[14.5px] font-medium">Placements</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A placement arrives from the TA System the day it is made, and accounts and the ops owner are told the same
          day. The fee is invoiced when the person joins, due thirty days from their first working day.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/placements" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nobody has been placed yet. A placement arrives from the TA System the day it is made, and accounts and the ops owner are told the same day."
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
