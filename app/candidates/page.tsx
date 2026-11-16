import Link from "next/link";
import { redirect } from "next/navigation";

import AuraMark from "@/app/AuraMark";
import Icon from "@/app/Icon";
import { PageBox, pillPrimary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { candidatesOnDesk, searchCandidates, tileLines } from "@/lib/candidates";
import { currentMember } from "@/lib/session";

const TONES = ["bg-brand-tint text-brand", "bg-info-soft text-info", "bg-warn-soft text-warn", "bg-violet-soft text-violet", "bg-sunk text-ink-soft"];

const CHIPS = [
  { key: "shortlisted", label: "Shortlisted by a client" },
  { key: "interview", label: "In an interview" },
  { key: "multi", label: "In more than one opening" },
] as const;

/**
 * Candidates (Figma 249:11300): a search, three quick filters, and the people in our openings.
 * They live in the TA System; this is a window onto them, so nothing here can be edited.
 */
export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { q = "", f } = await searchParams;
  const everyone = candidatesOnDesk(await desk());
  const shown = searchCandidates(everyone, q, CHIPS.some((c) => c.key === f) ? (f ?? null) : null);

  return (
    <PageBox width="1080" className="gap-8">
      <div className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-5">
        <form action="/candidates" className="flex h-[68px] w-full items-center gap-3 rounded-full bg-surface pl-6 pr-3 shadow-float">
          <Icon name="search" size={20} className="text-ink-faint" />
          {f && <input type="hidden" name="f" value={f} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, role or client"
            aria-label="Find a candidate"
            className="min-w-0 flex-1 bg-transparent text-[16px] leading-[26px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="submit" aria-label="Search" className="shrink-0 rounded-full">
            <AuraMark size={40} />
          </button>
        </form>
        <div className="flex flex-wrap justify-center gap-2.5">
          {CHIPS.map((c) => (
            <Link
              key={c.key}
              href={f === c.key ? "/candidates" : `/candidates?f=${c.key}${q ? "&q=" + encodeURIComponent(q) : ""}`}
              className={"rounded-full px-4 py-[9px] text-[14px] leading-[21px] transition-colors " + (f === c.key ? "bg-ink text-ink-inverse" : "bg-sunk text-ink hover:bg-rule")}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[26px] leading-[34px] text-ink">In your openings</h1>
        <span className="rounded-full bg-sunk px-3 py-1 text-[14px] leading-[21px] text-ink">{shown.length}</span>
        <span className="flex-1" />
        <span className="flex items-center gap-2 rounded-full bg-sunk px-4 py-2 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
          <Icon name="lock" size={14} />
          People live in the TA System — this is a window onto them
        </span>
        <Link href="/candidates/add" className={pillPrimary}>
          Add candidates
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[20px] bg-sunk px-5 py-6 text-[14px] text-ink-soft">
          {everyone.length === 0 ? "Nobody is in a CV set or an interview yet." : "Nobody matches that."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((p, i) => {
            const [role, line] = tileLines(p);
            return (
              <Link key={p.key} href={`/candidates/${encodeURIComponent(p.key)}`} className="flex items-start gap-3 rounded-[20px] bg-sunk p-4 transition-shadow hover:shadow-card">
                <span className={"flex size-10 shrink-0 items-center justify-center rounded-full text-[12px] font-medium " + TONES[i % TONES.length]}>{p.initials}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[16px] font-medium leading-[26px] text-ink">{p.name}</span>
                  <span className="truncate text-[14px] leading-[21px] text-ink-faint">{role}</span>
                  <span className="truncate text-[14px] leading-[21px] text-ink-faint">{line}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </PageBox>
  );
}
