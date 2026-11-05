import Link from "next/link";
import { redirect } from "next/navigation";

import { desk, guaranteesNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { daysLeftInWords, guaranteeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Guarantees (15, Phase 7).
 *
 * Ninety days from joining, and only valid while the fee is fully paid. Three
 * lists: the ones running, the ones where somebody left, and the ones that
 * are over. "Ending this month" is first, because that is the one worth
 * reading on a Monday.
 */
export default async function GuaranteesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  await runClocks();
  const now = Date.now();
  const month = 30 * 86_400_000;
  const db = await desk();
  const all = guaranteesNewestFirst(db);
  const holidays = db.holidays.map((h) => h.date);
  const rows: Listed[] = all.map((guarantee) => {
    const owner = memberIn(db, guarantee.ownerId)?.name ?? "nobody";
    const unpaid = !guarantee.feePaidAt && (guarantee.state === "running" || guarantee.state === "warned");
    return {
      id: guarantee.id,
      href: "/guarantees/" + guarantee.id,
      title: guarantee.candidateName,
      words: [owner, guarantee.openingTaId, guarantee.state],
      says:
        guaranteeInWords(guarantee, now, holidays) +
        (unpaid ? " · the fee is not paid in full, so it would not hold" : ""),
      at: guarantee.endsAt,
      late: unpaid || guarantee.state === "replacing",
      who: owner,
      chips: [
        { what: guarantee.state.replace(/_/g, " "), tone: guarantee.state === "ended_clean" ? ("done" as const) : ("quiet" as const) },
        ...(guarantee.state === "running" || guarantee.state === "warned"
          ? [{ what: daysLeftInWords(guarantee.endsAt, now), tone: "brand" as const }]
          : []),
        ...(unpaid ? [{ what: "fee unpaid", tone: "late" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);
  // The one a person asks about on a Monday: the next guarantee to end.
  const soonest = all
    .filter((one) => one.state === "running" || one.state === "warned")
    .sort((a, b) => a.endsAt - b.endsAt)[0];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[14.5px] font-medium">Guarantees</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Ninety days from the day somebody joined — not from the payment — and only valid while the fee is fully
          paid. A warning on day 75. If somebody leaves, a replacement comes first; a refund is the Director&rsquo;s
          decision, never a clock running out.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/guarantees" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "No guarantee is running. One starts by itself the day somebody joins, and runs ninety days from that day."
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

      {soonest && (
        <p className="text-[12px] text-ink-faint">
          The soonest ends in {daysLeftInWords(soonest.endsAt, now)}.
        </p>
      )}
    </div>
  );
}
