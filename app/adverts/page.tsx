import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, StatusChip } from "@/app/ui/figma";
import { adsNewestFirst, desk, member as memberIn, runClocks } from "@/data/desk";
import { adInWords } from "@/lib/adverts";
import { day, foundInWords, listed, type Listed } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export default async function AdvertsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q = "", sort } = await searchParams;

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

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 rounded-[28px] bg-surface px-7 py-8 shadow-card">
      <BackBar href="/positions" label="Openings" />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-[22px] text-ink-faint">
            TopJobs paid adverts · {spent > 0 ? `LKR ${spent.toLocaleString("en-US")} ordered so far` : "2-week run per advert"}
          </span>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">Paid adverts</h1>
        </div>

        <form action="/adverts" method="get" className="flex h-[44px] w-[320px] items-center gap-2.5 rounded-full bg-sunk px-4">
          <Icon name="find" size={18} className="shrink-0 text-ink-faint" />
          <input
            type="search"
            name="q" autoComplete="off"
            defaultValue={q}
            placeholder="Find an advert"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          {rows.length === 0
            ? "No advert has been asked for. One starts from a position’s Advertising tab: marketing makes the flyer, Ops orders it, and it closes two weeks after it goes live."
            : foundInWords(0, rows.length, q)}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-sunk px-5 py-4 transition-colors hover:bg-shell"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-medium text-ink">{row.title}</span>
                <span className={`text-[14px] ${row.late ? "text-danger" : "text-ink-soft"}`}>
                  {row.says}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {row.chips.map((c, idx) => (
                  <StatusChip
                    key={idx}
                    label={c.what}
                    tone={c.tone === "brand" ? "ok" : "neutral"}
                  />
                ))}
                <span className="text-[12px] text-ink-faint">
                  {row.who} · {day(row.at)}
                </span>
                <Icon name="chevron-right" size={18} className="text-ink-faint" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
