import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { BackBar, PageBox, StatusChip } from "@/app/ui/figma";
import { clientSetsNewestFirst, desk, member as memberIn, runClocks } from "@/data/desk";
import { MIN_CVS, whereItStands } from "@/lib/clientSets";
import { day, foundInWords, listed, type Listed } from "@/lib/listing";
import { currentMember } from "@/lib/session";
import { awaiting } from "@/lib/setsBoard";

export default async function SetsPage({
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
  const sets = clientSetsNewestFirst(db);

  const rows: Listed[] = sets.map((set) => {
    const owner = memberIn(db, set.ownerId)?.name ?? "nobody";
    const missing = set.candidates.filter((who) => !who.fileId).length;
    const undecided = awaiting(set);
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
    <PageBox width="full" className="gap-6">
      <BackBar href="/positions" label="Openings" />

      {msg && (
        <div className="rounded-[16px] border border-rule bg-sunk px-4 py-3 text-[14px] text-ink">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-[22px] text-ink-faint">
            At least {MIN_CVS} prepared CVs per set · 7 working days of client ownership
          </span>
          <h1 className="text-[40px] font-light leading-[50px] text-ink">CV sets</h1>
        </div>

        <form action="/sets" method="get" className="flex h-[44px] w-[320px] items-center gap-2.5 rounded-full bg-sunk px-4">
          <Icon name="find" size={18} className="shrink-0 text-ink-faint" />
          <input
            type="search"
            name="q" autoComplete="off"
            defaultValue={q}
            placeholder="Find a CV set or role"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[24px] bg-sunk px-6 py-8 text-[14px] text-ink-soft">
          {rows.length === 0
            ? "No set yet. One appears the moment the TA System says five CVs are ready, with its due date counted from the day the agreement was signed."
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
                    tone={c.tone === "done" ? "ok" : c.tone === "careful" ? "warn" : c.tone === "brand" ? "brand" : "neutral"}
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
    </PageBox>
  );
}
