import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { Avatar, Card, EmptyState, PageTitle, panelInput, pillPrimary } from "@/app/ui/figma";
import { desk } from "@/data/desk";
import { candidatesOnDesk, searchCandidates, tileLines } from "@/lib/candidates";
import { currentMember } from "@/lib/session";

const CHIPS = [
  { key: "shortlisted", label: "Shortlisted by a client" },
  { key: "interview", label: "In an interview" },
  { key: "multi", label: "In more than one opening" },
] as const;

/**
 * Candidates: a search, three quick filters, and the people in our openings. They live in the TA
 * System; this is a window onto them. (A role's own candidates are on its Sets tab.)
 */
export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { q = "", f } = await searchParams;
  const everyone = candidatesOnDesk(await desk());
  const shown = searchCandidates(everyone, q, CHIPS.some((c) => c.key === f) ? (f ?? null) : null);

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Candidates"
        sub="People live in the TA System. This is a window onto the ones in your openings."
        right={
          <Link href="/candidates/add" className={pillPrimary}>
            Add candidates
          </Link>
        }
      />
      <Card title="In your openings" sub={`${shown.length} ${shown.length === 1 ? "person" : "people"}`}>
        <form action="/candidates" className="flex flex-wrap items-center gap-2.5">
          {f && <input type="hidden" name="f" value={f} />}
          <input name="q" autoComplete="off" defaultValue={q} placeholder="Name, role or client" aria-label="Find a candidate" className={panelInput + " max-w-[420px] flex-1"} />
          <button type="submit" className={pillPrimary}>
            <Icon name="search" size={16} /> Search
          </button>
          {CHIPS.map((c) => (
            <Link
              key={c.key}
              href={f === c.key ? "/candidates" : `/candidates?f=${c.key}${q ? "&q=" + encodeURIComponent(q) : ""}`}
              className={"t-body-m rounded-full px-4 py-2.5 transition-colors " + (f === c.key ? "bg-ink text-ink-inverse" : "border border-rule bg-surface hover:bg-sunk")}
            >
              {c.label}
            </Link>
          ))}
        </form>
        {shown.length === 0 ? (
          <EmptyState title={everyone.length === 0 ? "Nobody is in a CV set or an interview yet" : "Nobody matches that"} icon="user" />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => {
              const [role, line] = tileLines(p);
              return (
                <Link key={p.key} href={`/candidates/${encodeURIComponent(p.key)}`} className="flex items-start gap-3 rounded-[16px] bg-sunk p-4 transition-colors hover:bg-rule/50">
                  <Avatar name={p.name} size="40" />
                  <span className="flex min-w-0 flex-col">
                    <span className="t-body-m truncate">{p.name}</span>
                    <span className="t-small truncate text-ink-3">{role}</span>
                    <span className="t-small truncate text-ink-3">{line}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
