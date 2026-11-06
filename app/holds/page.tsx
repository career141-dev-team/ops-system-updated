import Link from "next/link";
import { redirect } from "next/navigation";

import { clientIn, desk, holdsNewestFirst, member as memberIn, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
import { HOLD_MEANINGS, type HoldState } from "@/lib/clientFeedback";
import { currentMember } from "@/lib/session";

/**
 * Positions held because the client went quiet (15, Phase 4 steps 12 and 13).
 *
 * The owner's decision 6: a hold never closes by itself. So this screen exists
 * to be looked at — what is waiting for somebody to approve a notice, what is
 * held and for how long, and which ones are due their thirty-day review.
 */
export default async function HoldsPage({
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
  const holds = holdsNewestFirst(db);
  const days = (from: number) => Math.max(0, Math.round((now - from) / 86_400_000));
  const rows: Listed[] = holds.map((hold) => {
    const owner = memberIn(db, hold.ownerId)?.name ?? "nobody";
    const client = hold.clientId ? clientIn(db, hold.clientId) : null;
    return {
      id: hold.id,
      href: "/holds/" + hold.id,
      title: client?.name ?? hold.openingTaId,
      words: [owner, hold.openingTaId, hold.state, hold.reason],
      says:
        (HOLD_MEANINGS[hold.state as HoldState] ?? hold.state) +
        " · " +
        (hold.state === "lifted" ? (hold.liftedReason ?? hold.reason) : hold.reason),
      at: hold.liftedAt ?? hold.heldAt ?? hold.proposedAt,
      late: hold.state === "proposed" || Boolean(hold.reviewAt && hold.reviewAt < now),
      who: owner,
      chips: [
        { what: hold.state.replace(/_/g, " "), tone: hold.state === "lifted" ? ("done" as const) : ("quiet" as const) },
        ...(hold.state === "on_hold" ? [{ what: days(hold.heldAt ?? hold.proposedAt) + " days held", tone: "brand" as const }] : []),
        ...(hold.state === "proposed" ? [{ what: "needs a person", tone: "late" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Held positions</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          A client who has gone quiet does not lose their position: it goes on hold with a notice they actually
          receive, and it never closes by itself — somebody is asked about it every thirty days until they decide.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}


      <Toolbar action="/holds" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "Nothing is held. A hold is proposed by a clock when a client goes quiet for two weeks, and only holds once somebody approves the notice they get."
            : foundInWords(0, rows.length, q)}
        </p>
      ) : (
        <Table head={LIST_HEAD}>
          {shown.map((one) => (
            <ListRow
              key={one.id}
              href={one.href}
              title={one.title}
              says={one.says}
              chips={one.chips}
              who={one.who}
              when={day(one.at)}
              late={one.late}
            />
          ))}
        </Table>
      )}
    </div>
  );
}
