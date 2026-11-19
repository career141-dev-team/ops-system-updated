import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import { findAll, type FindItem } from "@/app/find/search";
import { desk, leadsNewestFirst } from "@/data/desk";
import { listed, type Listed } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Find or do as a page (frame G1, 145:2): the same four groups as the popover (Actions, People, Roles,
 * Recent) from `findAll`, on the canvas, 720 wide. The popover links here with `?q=` for "see all", and
 * the top bar's search lands here too. Enquiries and invoices are not in the popover's groups, so a
 * typed search adds them below.
 */
export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { q = "" } = await searchParams;
  const asked = q.trim();

  const db = await desk();
  const found = findAll(me, db, asked);

  const extra: FindItem[] = [];
  if (asked) {
    const rows: (Listed & { sub: string })[] = [
      ...leadsNewestFirst(db).map((l) => ({
        id: l.id, href: "/leads/" + l.id, title: l.company, words: [l.contactEmail ?? "", l.source],
        says: "", at: l.createdAt, late: false, who: "", chips: [], sub: "Enquiry · " + l.state.replace(/_/g, " "),
      })),
      ...db.invoices.map((i) => ({
        id: i.id, href: "/invoices/" + i.id, title: i.number, words: [i.kind, i.about ?? ""],
        says: "", at: i.sentAt ?? i.createdAt, late: false, who: "", chips: [], sub: "Invoice · " + i.state,
      })),
    ];
    for (const r of listed(rows, asked, undefined) as typeof rows) extra.push({ id: r.id, title: r.title, sub: r.sub, href: r.href });
  }

  const groups: { label: string; items: FindItem[]; kind: "action" | "person" | "role" | "recent" }[] = [
    { label: "Actions", items: found.actions, kind: "action" },
    { label: "People", items: found.people, kind: "person" },
    { label: "Roles", items: found.roles, kind: "role" },
    { label: asked ? "Clients and sets" : "Recent", items: found.recent, kind: "recent" },
    { label: "Enquiries and invoices", items: extra.slice(0, 6), kind: "recent" },
  ];
  const shown = groups.filter((g) => g.items.length);
  let first = true;

  return (
    <div className="mx-auto mt-6 w-full max-w-[720px] pb-10 md:mt-[72px]">
      <div className="flex flex-col rounded-[24px] bg-surface pb-2 shadow-card">
        <form action="/find" className="flex items-center gap-3.5 border-b border-rule px-[26px] py-5">
          <Icon name="search" size={20} className="shrink-0 text-ink-3" />
          <input
            name="q"
            defaultValue={asked}
            autoComplete="off"
            aria-label="Find or do"
            placeholder="Search clients, people, roles, or type an action"
            className="t-body-m min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
          {asked && (
            <Link href="/find" className="t-label shrink-0 rounded-[6px] border border-rule px-2 py-[3px] text-ink-3 hover:bg-sunk">
              clear
            </Link>
          )}
        </form>

        {shown.length === 0 ? (
          <p className="t-body px-[26px] py-6 text-ink-3">Nothing matched &ldquo;{asked}&rdquo;. Try a client, a person, a role or an invoice number.</p>
        ) : (
          shown.map((g) => (
            <div key={g.label} className="flex flex-col gap-0.5 px-2 pb-1 pt-2">
              <p className="t-micro px-4 pb-0.5 text-ink-3">{g.label.toUpperCase()}</p>
              {g.items.map((item) => {
                const hot = first && g.kind === "action";
                first = false;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    scroll={false}
                    className={"flex items-center gap-3.5 rounded-[14px] px-4 py-2.5 hover:bg-sunk " + (hot ? "bg-sunk" : "")}
                  >
                    {g.kind === "person" ? (
                      <span className="t-label flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-2">{item.initials || "?"}</span>
                    ) : (
                      <span className={"flex size-9 shrink-0 items-center justify-center rounded-[12px] " + (g.kind === "action" ? "bg-bg-brand text-brand" : "bg-sunk text-ink-2")}>
                        <Icon name={g.kind === "action" ? "calendar" : g.kind === "role" ? "briefcase" : "clock"} size={18} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="t-body-m block truncate text-ink">{item.title}</span>
                      <span className="t-small block truncate text-ink-3">{item.sub}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
