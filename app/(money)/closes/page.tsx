import Link from "next/link";
import { redirect } from "next/navigation";

import { checklistsNewestFirst, desk, positionIn } from "@/data/desk";
import { closeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Closing positions (15, Phase 7 step 11).
 *
 * The list of things that get forgotten when a position ends: the LinkedIn
 * post left up, the TopJobs advert nobody closed, the opening still open in
 * the TA System. Nothing closes until every item is ticked.
 */
export default async function ClosesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  const db = await desk();
  const all = checklistsNewestFirst(db);
  const open = all.filter((c) => !c.completedAt);
  const done = all.filter((c) => c.completedAt);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((checklist) => (
        <div key={checklist.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/closes/" + checklist.id} className="text-[13.5px] text-brand hover:underline">
              {positionIn(db, checklist.positionId ?? "")?.title ?? checklist.openingTaId}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{closeInWords(checklist)}</p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 className="text-[14.5px] font-medium">Closing positions</h2>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          Every way a position ends opens this list: a guarantee that ran its ninety days, a refund, a fee written
          off, a client who stopped, or a TA who closed the opening first. The items are the things that get
          forgotten.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {list("Still open", open, "Nothing waiting to be closed.")}
      {done.length > 0 && list("Closed", done, "")}
    </div>
  );
}
