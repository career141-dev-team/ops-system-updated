import { redirect } from "next/navigation";

import { clientSetsNewestFirst, desk, member as memberIn, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { MIN_CVS, whereItStands } from "@/lib/clientSets";
import { currentMember } from "@/lib/session";

/**
 * The CV sets (15, Phase 4 steps 2 to 4).
 *
 * Two lists, in the order the work matters: what is waiting to go, and what
 * has gone. A set nobody has sent is the thing that loses us a client, so it
 * is at the top with how long is left of what the agreement promised.
 */
export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q, sort } = await searchParams;

  // The clocks run on every visit while there is no scheduler on the laptop.
  await runClocks();
  const now = Date.now();
  const db = await desk();
  const sets = clientSetsNewestFirst(db);
  // Late first, then what is waiting, then what has gone: the order is the
  // answer on a list page (24, section 4).
  const rows: Listed[] = sets.map((set) => {
    const owner = memberIn(db, set.ownerId)?.name ?? "nobody";
    const missing = set.candidates.filter((who) => !who.fileId).length;
    const undecided = set.candidates.filter((who) => !who.decision).length;
    return {
      id: set.id,
      href: "/sets/" + set.id,
      title: set.name,
      words: [owner, set.openingTaId, set.role, set.state],
      says: whereItStands(set, now),
      at: set.receivedAt ?? set.sentAt ?? set.dueAt ?? set.createdAt,
      late: Boolean(set.dueAt && set.dueAt < now && set.state !== "sent"),
      who: owner,
      chips: [
        { what: set.state, tone: set.state === "sent" ? ("done" as const) : ("quiet" as const) },
        {
          what: set.candidates.length + " of " + MIN_CVS,
          tone: set.candidates.length - missing < MIN_CVS ? ("careful" as const) : ("brand" as const),
        },
        ...(set.state === "sent" && undecided ? [{ what: undecided + " undecided", tone: "brand" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-[17px] font-medium">CV sets</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          The TA System prepares a set; we send it. At least {MIN_CVS} CVs, every one kept exactly as the client
          received it, and the date it was due comes from the day the agreement was signed.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/sets" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "No set yet. One appears the moment the TA System says five CVs are ready, with its due date counted from the day the agreement was signed."
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
