import { redirect } from "next/navigation";

import {
  clientIn,
  desk,
  liveHoldFor,
  member as memberIn,
  outboxWaiting,
  positionsNewestFirst,
  runClocks,
} from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { depthInWords } from "@/lib/depth";
import { positionNextStep } from "@/lib/nextStep";
import { currentMember } from "@/lib/session";

/**
 * The positions, as a table (25, section 7).
 *
 * TA owns the opening and does the searching; this is Ops's own view of it,
 * so a client can be answered without opening the TA System. The line under
 * each name is the same sentence the position's own page shows - whose move
 * it is - so the list and the page cannot say different things.
 */
export default async function PositionsPage({
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
  const queued = new Set(
    outboxWaiting(db)
      .filter((one) => one.subjectType === "position")
      .map((one) => one.subjectId),
  );

  const rows: Listed[] = positionsNewestFirst(db).map((position) => {
    const client = position.clientId ? clientIn(db, position.clientId) : null;
    const hold = position.openingTaId ? liveHoldFor(db, position.openingTaId) : null;
    const sets = db.clientSets.filter((row) => row.openingTaId === position.openingTaId);
    const sent = sets.filter((row) => row.state === "sent").length;
    const step = positionNextStep(
      position,
      {
        queued: queued.has(position.id),
        depthSaid: position.openingTaId ? depthInWords(position) : null,
        holdState: hold ? hold.state : null,
        setsSent: sent,
      },
      now,
    );
    const owner = memberIn(db, position.ownerId)?.name ?? "nobody";
    return {
      id: position.id,
      href: "/positions/" + position.id,
      title: (client?.name ?? position.clientTaId) + " · " + position.title,
      words: [owner, position.openingTaId ?? "", position.title, client?.name ?? ""],
      says: step.waiting,
      at: position.updatedAt ?? position.createdAt,
      late: hold?.state === "proposed",
      who: owner,
      chips: [
        { what: position.stage.replace(/_/g, " "), tone: "quiet" as const },
        ...(position.openingTaId ? [] : [{ what: "no opening yet", tone: "careful" as const }]),
        ...(sent ? [{ what: sent + (sent === 1 ? " set sent" : " sets sent"), tone: "brand" as const }] : []),
        ...(hold ? [{ what: hold.state === "proposed" ? "hold proposed" : "on hold", tone: "late" as const }] : []),
      ],
    };
  });

  const shown = listed(rows, q, sort);

  return (
    <div className="flex flex-col gap-3">
      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <Toolbar action="/positions" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nothing has been handed over yet. A position appears here when a requirement meeting is held and the role goes to the TA System - including the ones TA has not confirmed an opening for."
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
