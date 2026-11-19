import { redirect } from "next/navigation";

import { Card, DataTable, EmptyState, PageTitle, StatusChip, type Tone } from "@/app/ui/figma";
import { checklistsNewestFirst, clientIn, desk, member as memberIn, positionIn } from "@/data/desk";
import { closeInWords } from "@/lib/guarantee";
import { currentMember } from "@/lib/session";

/**
 * Closing positions index (`/closes`).
 */
export default async function ClosesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; view?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, view = "all" } = await searchParams;

  const db = await desk();
  const all = checklistsNewestFirst(db);

  const cards = all.map((checklist) => {
    const owner = memberIn(db, checklist.ownerId)?.name ?? "Unassigned";
    const position = checklist.positionId ? positionIn(db, checklist.positionId) : null;
    const client = position?.clientId ? clientIn(db, position.clientId) : null;
    const doneCount = checklist.items.filter((i) => Boolean(i.doneAt)).length;
    const totalCount = checklist.items.length;
    const isClosed = Boolean(checklist.completedAt);

    return {
      checklist,
      owner,
      title: position?.title ?? checklist.openingTaId,
      overline: `${client?.name ?? "Opening"} · ${checklist.trigger.replace(/_/g, " ")}`,
      statusText: isClosed ? "Closed" : closeInWords(checklist),
      statusTone: (isClosed ? "ok" : "warn") as Tone,
      clockText: `${doneCount} of ${totalCount} done`,
      isClosed,
    };
  });

  const openList = cards.filter((c) => !c.isClosed);
  const closedList = cards.filter((c) => c.isClosed);
  const shown = view === "open" ? openList : view === "closed" ? closedList : cards;

  const views = [
    { key: "all", label: "All", count: cards.length, href: "/closes" },
    { key: "open", label: "Open", count: openList.length, href: "/closes?view=open" },
    { key: "closed", label: "Closed", count: closedList.length, href: "/closes?view=closed" },
  ];

  return (
    <div className="flex flex-col gap-[22px]">
      <PageTitle
        title="Closing positions"
        sub="Every way a position ends opens this list: a guarantee that ran its ninety days, a refund, a fee written off, a client who stopped, or a TA who closed the opening first."
        tabs={views}
        active={view}
      />

      {msg && <p className="rounded-[20px] bg-brand-tint px-5 py-3 text-[14px] font-medium text-brand-ink">{msg}</p>}

      <Card>
        <DataTable
          columns={[{ label: "Position" }, { label: "Why" }, { label: "Owner" }, { label: "Progress" }, { label: "State" }]}
          empty={
            <EmptyState title="Nothing is closing right now">
              A checklist opens automatically when a guarantee ends, a refund is decided, or a position stops.
            </EmptyState>
          }
          rows={shown.map((c) => ({
            key: c.checklist.id,
            href: `/closes/${c.checklist.id}`,
            cells: [
              c.title,
              c.overline,
              c.owner,
              c.clockText,
              <StatusChip key="s" label={c.statusText} tone={c.statusTone} />,
            ],
          }))}
        />
      </Card>
    </div>
  );
}
