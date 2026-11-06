import Link from "next/link";
import { redirect } from "next/navigation";

import { checklistsNewestFirst, desk, member as memberIn, positionIn } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { closeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Closing positions (15, Phase 7 step 11).
 *
 * The list of things that get forgotten when a position ends: the LinkedIn
 * post left up, the TopJobs advert nobody closed, the opening still open in
 * the TA System. Nothing closes until every item is ticked.
 */
export default async function ClosesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  const db = await desk();
  const all = checklistsNewestFirst(db);
  const rows: Listed[] = all.map((checklist) => {
    const owner = memberIn(db, checklist.ownerId)?.name ?? "nobody";
    const left = checklist.items.filter((item) => !item.doneAt).length;
    return {
      id: checklist.id,
      href: "/closes/" + checklist.id,
      title: positionIn(db, checklist.positionId ?? "")?.title ?? checklist.openingTaId,
      words: [owner, checklist.trigger, checklist.openingTaId],
      says: closeInWords(checklist),
      at: checklist.completedAt ?? checklist.createdAt,
      late: !checklist.completedAt && left > 0,
      who: owner,
      chips: [
        { what: checklist.trigger.replace(/_/g, " "), tone: "quiet" as const },
        checklist.completedAt
          ? { what: "closed", tone: "done" as const }
          : { what: left + (left === 1 ? " item left" : " items left"), tone: "brand" as const },
      ],
    };
  });
  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[14.5px] font-medium">Closing positions</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Every way a position ends opens this list: a guarantee that ran its ninety days, a refund, a fee written
          off, a client who stopped, or a TA who closed the opening first. The items are the things that get
          forgotten.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/closes" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nothing is closing. A list opens by itself when a guarantee ends, a refund is decided, a fee is written off, or a TA closes the opening first."
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
