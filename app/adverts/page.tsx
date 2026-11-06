import Link from "next/link";
import { redirect } from "next/navigation";

import { adsNewestFirst, desk, member as memberIn, runClocks } from "@/data/desk";
import { LIST_HEAD, ListRow, Table, Toolbar } from "@/app/ui";
import { SORTS, day, foundInWords, listed, type Listed } from "@/lib/listing";
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
export default async function AdvertsPage({
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
  const all = adsNewestFirst(db);
  const spent = all.filter((ad) => ad.state !== "dropped").reduce((sum, ad) => sum + (ad.cost ?? 0), 0);
  const rows: Listed[] = all.map((ad) => {
    const owner = memberIn(db, ad.ownerId)?.name ?? "nobody";
    return {
      id: ad.id,
      href: "/adverts/" + ad.id,
      title: ad.title,
      words: [owner, ad.channel, ad.openingTaId, ad.state],
      says: adInWords(ad, now),
      at: ad.closedAt ?? ad.liveAt ?? ad.createdAt,
      late: Boolean(ad.closesAt && ad.closesAt < now && ad.state === "live"),
      who: owner,
      chips: [
        { what: ad.channel, tone: "quiet" as const },
        { what: ad.state, tone: ad.state === "live" ? ("brand" as const) : ("quiet" as const) },
        ...(ad.cost ? [{ what: "LKR " + ad.cost.toLocaleString(), tone: "quiet" as const }] : []),
      ],
    };
  });
  const shown = listed(rows, q, sort);

  const card = "rounded-2xl border border-rule bg-surface px-5 py-4";
  const row = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-3 first:border-t-0";

  return (
    <div className="flex flex-col gap-3">
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

      <Toolbar action="/adverts" q={q} sort={sort} sorts={SORTS} found={foundInWords(shown.length, rows.length, q)} />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface px-4 py-6 text-[13px] text-ink-soft">
          {rows.length === 0
            ? "No advert has been asked for. One starts from a position: marketing makes the flyer, ops orders it, and it closes two weeks after it goes live."
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
