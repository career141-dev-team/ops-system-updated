import Link from "next/link";
import { redirect } from "next/navigation";

import { adsNewestFirst, desk, runClocks } from "@/data/desk";
import { adInWords } from "@/lib/adverts";
import { currentMember } from "@/lib/session";

/**
 * Paid adverts (15, Phase 3 step 12).
 *
 * TopJobs, which is the one with money in it: a TA asks, marketing makes the
 * flyer, ops orders it, TopJobs says when it is live, and it comes down two
 * weeks later. Nothing here spends anything by itself — the order is a
 * drafted email somebody approves, and what they charge is written down as it
 * was agreed.
 *
 * LinkedIn is recorded on the position (it is the TA's, and free), and Talent
 * Pulse has its own weekly issue.
 */
export default async function AdvertsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;

  await runClocks();
  const now = Date.now();
  const db = await desk();
  const all = adsNewestFirst(db);
  const doing = all.filter((a) => a.state === "requested" || a.state === "flyer" || a.state === "ordered");
  const live = all.filter((a) => a.state === "live");
  const over = all.filter((a) => a.state === "closed" || a.state === "dropped");
  const spent = all.filter((a) => a.state !== "dropped").reduce((sum, a) => sum + (a.cost ?? 0), 0);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  const list = (title: string, rows: typeof all, empty: string) => (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14.5px] font-medium">{title}</h2>
        <span className="text-[12.5px] text-ink-soft">{rows.length}</span>
      </div>
      {rows.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">{empty}</p>}
      {rows.map((ad) => (
        <div key={ad.id} className={row}>
          <div className="min-w-0 flex-1">
            <Link href={"/adverts/" + ad.id} className="text-[13.5px] text-brand hover:underline">
              {ad.title}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{adInWords(ad, now)}</p>
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-medium">Paid adverts</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-soft">
          TopJobs. A TA asks for one from the position, marketing makes the flyer — they take an image, not a job
          description — ops orders it, and it comes down two weeks after it goes live. The CV count against it is what
          judges the next one.
        </p>
        {spent > 0 && (
          <p className="mt-2 text-[13px]">LKR {spent.toLocaleString("en-US")} ordered so far, across every advert.</p>
        )}
      </div>

      {msg && <p className="rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      {list("Live", live, "Nothing is live.")}
      {list("Being arranged", doing, "Nothing waiting.")}
      {over.length > 0 && list("Over", over, "")}

      <p className="text-[12px] text-ink-faint">
        An advert is asked for from its own position. LinkedIn is recorded there too; Talent Pulse is on{" "}
        <Link href="/talent-pulse" className="text-brand hover:underline">
          its own page
        </Link>
        .
      </p>
    </div>
  );
}
