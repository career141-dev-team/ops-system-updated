import Link from "next/link";
import { redirect } from "next/navigation";

import { clientSetsNewestFirst, desk, member as memberIn, runClocks } from "@/data/desk";
import { MIN_CVS, whereItStands } from "@/lib/clientSets";
import { currentMember } from "@/lib/session";

/**
 * The CV sets (15, Phase 4 steps 2 to 4).
 *
 * Two lists, in the order the work matters: what is waiting to go, and what
 * has gone. A set nobody has sent is the thing that loses us a client, so it
 * is at the top with how long is left of what the agreement promised.
 */
export default async function SetsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  // The clocks run on every visit while there is no scheduler on the laptop.
  await runClocks();
  const now = Date.now();
  const db = await desk();
  const sets = clientSetsNewestFirst(db);
  const waiting = sets
    .filter((r) => r.state !== "sent")
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  const gone = sets.filter((r) => r.state === "sent");

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "border-t border-rule py-3 first:border-t-0";

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">CV sets</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          The TA System prepares a set; we send it. At least {MIN_CVS} CVs, every one kept exactly as the client
          received it, and the date it was due comes from the day the agreement was signed.
        </p>
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-medium">Waiting to go</h2>
          <span className="text-[12.5px] text-ink-soft">{waiting.length}</span>
        </div>
        {waiting.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-soft">
            Nothing waiting. A set appears here the moment the TA System says one is ready.
          </p>
        )}
        {waiting.map((set) => {
          const late = set.dueAt !== null && set.dueAt < now;
          return (
            <div key={set.id} className={row}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={"/sets/" + set.id} className="text-[13.5px] text-brand hover:underline">
                  {set.name}
                </Link>
                <span className="ml-auto text-[12px] text-ink-faint">{memberIn(db, set.ownerId)?.name ?? "nobody"}</span>
              </div>
              <p className={"mt-0.5 text-[12.5px] " + (late ? "text-danger" : "text-ink-soft")}>
                {whereItStands(set, now)}
              </p>
            </div>
          );
        })}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-medium">Sent</h2>
          <span className="text-[12.5px] text-ink-soft">{gone.length}</span>
        </div>
        {gone.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing sent yet.</p>}
        {gone.map((set) => (
          <div key={set.id} className={row}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <Link href={"/sets/" + set.id} className="text-[13.5px] text-brand hover:underline">
                {set.name}
              </Link>
              <span className="text-[12px] text-ink-faint">to {set.sentTo.join(", ") || "nobody recorded"}</span>
              <span className="ml-auto text-[12px] text-ink-faint">{memberIn(db, set.ownerId)?.name ?? "nobody"}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{whereItStands(set, now)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
