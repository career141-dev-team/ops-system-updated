import Link from "next/link";
import { redirect } from "next/navigation";
import Icon, { type IconName } from "@/app/Icon";
import {
  clientsNewestFirst,
  desk,
  leadsNewestFirst,
  member as memberIn,
  positionsNewestFirst,
} from "@/data/desk";
import { PageBox, figmaField, pillPrimary } from "@/app/ui/figma";
import { day, listed, type Listed } from "@/lib/listing";
import { currentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

type KindKey =
  | "client"
  | "enquiry"
  | "position"
  | "CV set"
  | "interview"
  | "placement"
  | "invoice";

const GROUP_META: { key: KindKey; heading: string; icon: IconName }[] = [
  { key: "client", heading: "CLIENT", icon: "clients" },
  { key: "enquiry", heading: "ENQUIRIES", icon: "clients" },
  { key: "position", heading: "OPENINGS", icon: "briefcase" },
  { key: "CV set", heading: "CV SETS", icon: "send" },
  { key: "interview", heading: "INTERVIEWS", icon: "calendar" },
  { key: "placement", heading: "PLACEMENTS", icon: "user" },
  { key: "invoice", heading: "INVOICES", icon: "wallet" },
];

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { q, sort } = await searchParams;

  const db = await desk();
  const who = (id: string) => memberIn(db, id)?.name ?? "nobody";
  const rows: (Listed & { kind: KindKey })[] = [];

  for (const lead of leadsNewestFirst(db)) {
    rows.push({
      id: "lead:" + lead.id,
      kind: "enquiry",
      href: "/leads/" + lead.id,
      title: lead.company,
      words: [who(lead.ownerId), lead.contactEmail ?? "", lead.source],
      says: "An enquiry, " + lead.state.replace(/_/g, " "),
      at: lead.createdAt,
      late: false,
      who: who(lead.ownerId),
      chips: [{ what: "enquiry", tone: "quiet" }],
    });
  }

  for (const client of clientsNewestFirst(db)) {
    rows.push({
      id: "client:" + client.id,
      kind: "client",
      href: "/clients/" + client.id,
      title: client.name,
      words: [who(client.ownerId), client.billingEmail, client.nameKey],
      says: "A client, " + client.stage,
      at: client.updatedAt ?? client.createdAt,
      late: false,
      who: who(client.ownerId),
      chips: [{ what: "client", tone: "brand" }],
    });
  }

  for (const position of positionsNewestFirst(db)) {
    rows.push({
      id: "position:" + position.id,
      kind: "position",
      href: "/positions/" + position.id,
      title: position.title,
      words: [who(position.ownerId), position.clientTaId, position.openingTaId ?? ""],
      says: "A position, " + position.stage.replace(/_/g, " "),
      at: position.updatedAt ?? position.createdAt,
      late: false,
      who: who(position.ownerId),
      chips: [{ what: "position", tone: "quiet" }],
    });
  }

  for (const set of db.clientSets) {
    rows.push({
      id: "set:" + set.id,
      kind: "CV set",
      href: "/sets/" + set.id,
      title: set.name,
      words: [who(set.ownerId), set.openingTaId, set.role],
      says: "A CV set, " + set.state,
      at: set.updatedAt ?? set.createdAt,
      late: false,
      who: who(set.ownerId),
      chips: [{ what: "CV set", tone: "quiet" }],
    });
  }

  for (const interview of db.interviews) {
    rows.push({
      id: "interview:" + interview.id,
      kind: "interview",
      href: "/interviews/" + interview.id,
      title: interview.candidateName,
      words: [who(interview.ownerId), interview.openingTaId, interview.applicationTaId],
      says: "An interview, round " + interview.round + ", " + interview.state,
      at: interview.at ?? interview.createdAt,
      late: false,
      who: who(interview.ownerId),
      chips: [{ what: "interview", tone: "quiet" }],
    });
  }

  for (const placement of db.placements) {
    rows.push({
      id: "placement:" + placement.id,
      kind: "placement",
      href: "/placements/" + placement.id,
      title: placement.candidateName,
      words: [who(placement.ownerId), placement.openingTaId, placement.placementTaId],
      says: "A placement, " + placement.state.replace(/_/g, " "),
      at: placement.updatedAt ?? placement.createdAt,
      late: false,
      who: who(placement.ownerId),
      chips: [{ what: "placement", tone: "quiet" }],
    });
  }

  for (const invoice of db.invoices) {
    rows.push({
      id: "invoice:" + invoice.id,
      kind: "invoice",
      href: "/invoices/" + invoice.id,
      title: invoice.number,
      words: [who(invoice.ownerId), invoice.kind, invoice.about ?? ""],
      says: "An invoice, " + invoice.state,
      at: invoice.sentAt ?? invoice.createdAt,
      late: false,
      who: who(invoice.ownerId),
      chips: [{ what: "invoice", tone: "quiet" }],
    });
  }

  const asked = (q ?? "").trim();
  const shown = asked ? (listed(rows, q, sort) as (Listed & { kind: KindKey })[]) : [];
  const topHit = shown[0];

  return (
    <PageBox width="1080">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-serif text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
              {asked ? `“${asked}”` : "Find anything"}
            </h1>
            <span className="text-[14px] text-ink-faint">
              {asked
                ? `${shown.length} result${shown.length === 1 ? "" : "s"}`
                : `${rows.length} records on the desk`}
            </span>
          </div>
          <form action="/find" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={asked}
              placeholder="Search clients, openings, sets, invoices..."
              className={figmaField + " w-[280px]"}
            />
            <button type="submit" className={pillPrimary}>
              Search
            </button>
          </form>
        </div>

        {asked && shown.length > 0 && (
          <Link
            href={topHit.href}
            className="flex items-center gap-3.5 rounded-[24px] bg-sunk px-5 py-4 transition hover:bg-sunk/80"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-surface">
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] text-ink">
                Top match: <strong className="font-medium">{topHit.title}</strong> ({topHit.says}).
                {shown.length > 1
                  ? ` ${shown.length - 1} other matching record${shown.length - 1 === 1 ? "" : "s"} below.`
                  : ""}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-ink-faint">
                AURA · from across the desk
              </p>
            </div>
            <Icon name="chevron-right" size={16} className="shrink-0 text-ink-faint" />
          </Link>
        )}

        {!asked ? (
          <div className="rounded-[24px] border border-edge bg-surface p-6">
            <p className="text-[14px] text-ink-soft">
              Type a client name, role, candidate, invoice number, or owner above. The search looks
              across enquiries, clients, openings, CV sets, interviews, placements, and invoices at
              once.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-[24px] border border-edge bg-surface p-6">
            <p className="text-[14px] text-ink-soft">
              Nothing matched “{asked}” across {rows.length} records.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {GROUP_META.map((group) => {
              const items = shown.filter((r) => r.kind === group.key);
              if (items.length === 0) return null;
              return (
                <div key={group.key}>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
                    {group.heading}
                  </div>
                  <div className="rounded-[24px] border border-edge bg-surface p-2">
                    <div className="divide-y divide-edge/60">
                      {items.map((row) => (
                        <Link
                          key={row.id}
                          href={row.href}
                          className="flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition hover:bg-sunk/60"
                        >
                          <div className="flex min-w-0 items-center gap-3.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft">
                              <Icon name={group.icon} size={16} />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-[14px] font-medium text-ink">
                                {row.title}
                              </div>
                              <div className="truncate text-[12px] text-ink-soft">
                                {row.says} · {row.who}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[12.5px] text-ink-faint">{day(row.at)}</span>
                            <Icon name="chevron-right" size={16} className="text-ink-faint" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageBox>
  );
}
