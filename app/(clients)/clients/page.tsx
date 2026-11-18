import Link from "next/link";
import { redirect } from "next/navigation";

import Icon from "@/app/Icon";
import {
  Avatar,
  FoldRow,
  PageBox,
  RecordCard,
  StatusChip,
  ViewPills,
  pillPrimary,
  type Tone,
} from "@/app/ui/figma";
import {
  agreementForLead,
  clientsNewestFirst,
  desk,
  leadIn,
  leadsNewestFirst,
  meetingsForLead,
  member as memberIn,
  requirementForLead,
} from "@/data/desk";
import { agoShort, agreementEyebrow, dotTone, sourceShort } from "@/lib/clientCards";
import { whereItStands } from "@/lib/esa";
import { day } from "@/lib/listing";
import { KIND_MEANINGS, type MeetingKind, meetingsAhead, whenInWords } from "@/lib/meetings";
import { clientNextStep, leadNextStep } from "@/lib/nextStep";
import { REQUIREMENT_FIELDS } from "@/lib/requirements";
import { SOURCE_MEANINGS, leadSection } from "@/lib/leads";
import { currentMember } from "@/lib/session";

/**
 * CL · Clients — directory (Figma frame 1:422).
 *
 * One unified directory inside the PageBox sheet with inline ViewPills
 * (All, Leads, Clients, On hold, Declined), search, "Who owns what",
 * "Capture lead", and the three 4-card sections:
 *   1. New leads
 *   2. Agreement in progress
 *   3. Active clients
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; q?: string; filter?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg, q = "", filter = "all" } = await searchParams;

  const db = await desk();
  const now = Date.now();
  const query = q.trim().toLowerCase();
  const matchesQuery = (...parts: (string | null | undefined)[]) => {
    if (!query) return true;
    return parts.some((p) => (p ?? "").toLowerCase().includes(query));
  };

  const requiredReqFields = REQUIREMENT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const allLeads = leadsNewestFirst(db);
  const allClients = clientsNewestFirst(db);
  const allHolds = db.holds.filter((h) => h.state !== "lifted");

  const leadStep = (lead: (typeof allLeads)[number]) => {
    const requirement = requirementForLead(db, lead.id);
    return leadNextStep(lead, {
      meetings: meetingsForLead(db, lead.id),
      esa: agreementForLead(db, lead.id),
      requirement,
      position: requirement ? db.positions.find((p) => p.requirementId === requirement.id) ?? null : null,
      requiredFields: requiredReqFields,
    });
  };

  const clientStep = (client: (typeof allClients)[number]) =>
    clientNextStep(client, {
      positions: db.positions.filter((row) => row.clientId === client.id),
      sets: db.clientSets.filter((row) => row.clientId === client.id),
      owing: db.invoices.filter(
        (row) => row.clientId === client.id && (row.state === "sent" || row.state === "partly_paid"),
      ),
      holds: db.holds.filter((row) => row.clientId === client.id),
      unanswered: new Set(
        db.inbound
          .filter((row) => row.clientId === client.id && row.readState === "new")
          .map((row) => row.from + "|" + row.subject + "|" + row.receivedAt),
      ).size,
    });

  // Categorise leads & clients to match Figma 1:422 sections
  // One rule decides where a lead is shown (src/lib/leads.ts, leadSection), so the
  // count and every list agree. A lead with its opening made is still in its
  // agreement and requirement, so it sits with "Agreement in progress".
  const sectionOf = (l: (typeof allLeads)[number]) => leadSection(l.state, agreementForLead(db, l.id)?.state ?? null);
  const leadMatches = (l: (typeof allLeads)[number]) =>
    matchesQuery(l.company, l.industry, l.contactName, l.contactEmail, l.notes, l.reason);
  const newLeads = allLeads.filter((l) => sectionOf(l) === "new" && leadMatches(l));
  const agreementLeads = allLeads.filter((l) => ["agreement", "opening"].includes(sectionOf(l)) && leadMatches(l));
  const declinedLeads = allLeads.filter((l) => sectionOf(l) === "closed" && leadMatches(l));

  const activeClientRows = allClients.filter(
    (c) =>
      c.stage !== "closed" &&
      matchesQuery(c.name, c.billingName, c.billingEmail, c.notes),
  );

  const heldClientIds = new Set(allHolds.map((h) => h.clientId).filter(Boolean));
  const onHoldClients = allClients.filter(
    (c) =>
      (c.stage === "on_hold" || heldClientIds.has(c.id)) &&
      matchesQuery(c.name, c.billingName, c.reason),
  );

  const totalOpenLeads = newLeads.length + agreementLeads.length;
  const totalClients = allClients.filter((c) => c.stage !== "closed").length;
  const totalOnHold = Math.max(onHoldClients.length, allHolds.length);
  const totalDeclined = declinedLeads.length;

  const pills = [
    { key: "all", label: "All", href: "/clients" + (q ? `?q=${encodeURIComponent(q)}` : "") },
    {
      key: "leads",
      label: "Leads",
      count: totalOpenLeads,
      href: "/clients?filter=leads" + (q ? `&q=${encodeURIComponent(q)}` : ""),
    },
    {
      key: "clients",
      label: "Clients",
      count: totalClients,
      href: "/clients?filter=clients" + (q ? `&q=${encodeURIComponent(q)}` : ""),
    },
    {
      key: "hold",
      label: "On hold",
      count: totalOnHold,
      href: "/clients?filter=hold" + (q ? `&q=${encodeURIComponent(q)}` : ""),
    },
    {
      key: "declined",
      label: "Declined",
      count: totalDeclined,
      href: "/clients?filter=declined" + (q ? `&q=${encodeURIComponent(q)}` : ""),
    },
  ];

  const renderLeadCard = (lead: (typeof allLeads)[number]) => {
    const owner = memberIn(db, lead.ownerId)?.name ?? "Unassigned";
    const esa = agreementForLead(db, lead.id);
    const step = leadStep(lead);
    const meetings = meetingsForLead(db, lead.id);
    const intro = meetings.find((m) => m.kind === "intro");

    const declined = lead.state === "declined_industry" || lead.state.startsWith("closed");
    const flagged = Boolean(lead.industryFlagged && !lead.industryConfirmedBy);
    const late = flagged || Boolean(esa?.expiresAt && esa.expiresAt < now);
    const booked = Boolean(intro) || lead.state === "requirement" || esa?.state === "negotiating";
    const tone: Tone = declined ? "danger" : esa?.state === "signed" ? "violet" : dotTone({ late, booked, ours: !booked });
    // A lead marked "open it now, without waiting" (a trusted client) says so on its card.
    const eyebrow = (esa ? agreementEyebrow(esa.state) : sourceShort(lead.source)) + (lead.openEarlyAt ? " · opened early" : "");
    const when = flagged
      ? "Today"
      : esa?.sentAt
        ? `Day ${Math.max(1, Math.round((now - esa.sentAt) / 86_400_000))} of 14`
        : intro && intro.at > now
          ? whenInWords(intro.at, now)
          : agoShort(lead.createdAt, now);

    const cardHref =
      esa?.state === "signed"
        ? `/leads/${lead.id}?view=agreement`
        : lead.state === "requirement"
          ? `/leads/${lead.id}?view=requirement`
          : `/leads/${lead.id}`;

    return (
      <RecordCard
        key={lead.id}
        href={cardHref}
        eyebrow={eyebrow}
        title={lead.company}
        statusText={step.where}
        statusTone={tone}
        rightMeta={when}
        ownerName={owner}
      />
    );
  };

  const renderClientCard = (client: (typeof allClients)[number]) => {
    const owner = memberIn(db, client.ownerId)?.name ?? "Unassigned";
    const step = clientStep(client);
    const openPositions = db.positions.filter(
      (p) => p.clientId === client.id && p.stage !== "closed",
    );
    const activeHold = allHolds.find((h) => h.clientId === client.id);
    const inGuarantee = db.guarantees.filter((g) => {
      const pl = db.placements.find((p) => p.id === g.placementId);
      const pos = pl ? db.positions.find((p) => p.openingTaId === pl.openingTaId) : null;
      return pos?.clientId === client.id && (g.state === "running" || g.state === "warned");
    }).length;

    const sinceYear = new Date(client.createdAt).getFullYear();
    const lead = client.leadId ? leadIn(db, client.leadId) : null;
    const industry = lead?.industry || client.billingName || "Client";

    return (
      <RecordCard
        key={client.id}
        href={`/clients/${client.id}`}
        eyebrow={openPositions.length > 0 ? `${openPositions.length} ${openPositions.length === 1 ? "opening" : "openings"}` : inGuarantee > 0 ? `${inGuarantee} in guarantee` : "No openings"}
        title={client.name}
        statusText={activeHold ? `On hold · ${Math.max(1, Math.round((now - (activeHold.heldAt ?? activeHold.proposedAt)) / 86_400_000))}d` : step.where}
        statusTone={activeHold ? "warn" : openPositions.length > 0 ? "ok" : "neutral"}
        rightMeta={`Since ${sinceYear}`}
        ownerName={owner}
      />
    );
  };

  const aheadMeetings = meetingsAhead(db.meetings, now);

  return (
    <PageBox width="full" className="gap-8">
      {msg && (
        <p className="rounded-[16px] bg-sunk px-4 py-3 text-[14px] text-ink">{msg}</p>
      )}

      {/* Top filter & action bar (Figma 249:11696): the pills, then the find box and Capture lead on the same row */}
      <ViewPills
        items={pills}
        active={filter}
        rightSlot={
        <div className="flex flex-wrap items-center gap-2.5">
          <form
            action="/clients"
            className="flex h-[46px] w-[260px] items-center gap-2.5 rounded-full bg-sunk pl-4 pr-2 sm:w-[300px]"
          >
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
            <input
              name="q" autoComplete="off"
              defaultValue={q}
              placeholder="Find one of your clients"
              aria-label="Find one of your clients"
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] text-ink outline-none placeholder:text-ink-faint"
            />
            <kbd className="rounded-[6px] bg-surface px-[7px] py-0.5 font-sans text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
              /
            </kbd>
          </form>

          <Link href="/leads/new" className={pillPrimary}>
            <Icon name="plus" size={16} />
            Capture lead
          </Link>
        </div>
        }
      />

      {/* Filtered views */}
      {filter === "leads" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] font-normal leading-[34px] text-ink">Leads</h1>
              <span className="text-[14px] text-ink-faint">
                {newLeads.length + agreementLeads.length}
              </span>
            </div>
          </div>
          {newLeads.length + agreementLeads.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
              No open leads matching your search. Use Capture lead to record a new enquiry.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {[...newLeads, ...agreementLeads].map(renderLeadCard)}
            </div>
          )}

          {aheadMeetings.length > 0 && (
            <FoldRow
              title="Meetings booked"
              summary={`${aheadMeetings.length} upcoming`}
            >
              <div className="flex flex-col gap-2">
                {aheadMeetings.map((m) => {
                  const theirLead = leadIn(db, m.leadId);
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-rule py-2 first:border-t-0 text-[14px]"
                    >
                      <div className="flex items-center gap-3">
                        <span className={m.at < now ? "text-danger" : "text-ink-soft"}>
                          {whenInWords(m.at, now)}
                        </span>
                        <Link
                          href={"/leads/" + (theirLead?.id ?? "")}
                          className="font-medium text-brand hover:underline"
                        >
                          {theirLead?.company ?? "Lead"}
                        </Link>
                        <span className="text-ink-faint">
                          {KIND_MEANINGS[m.kind as MeetingKind] ?? m.kind}
                        </span>
                      </div>
                      <span className="text-[13px] text-ink-faint">
                        {theirLead ? (memberIn(db, theirLead.ownerId)?.name ?? "") : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </FoldRow>
          )}
        </div>
      )}

      {filter === "agreements" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] font-normal leading-[34px] text-ink">
                Agreement in progress
              </h1>
              <span className="text-[14px] text-ink-faint">{agreementLeads.length}</span>
            </div>
          </div>
          {agreementLeads.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
              Nothing waiting on an agreement right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {agreementLeads.map(renderLeadCard)}
            </div>
          )}
        </div>
      )}

      {filter === "clients" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] font-normal leading-[34px] text-ink">
                Active clients
              </h1>
              <span className="text-[14px] text-ink-faint">{activeClientRows.length}</span>
            </div>
          </div>
          {activeClientRows.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
              No active clients yet. A client appears here once their agreement is countersigned.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {activeClientRows.map(renderClientCard)}
            </div>
          )}
        </div>
      )}

      {filter === "hold" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] font-normal leading-[34px] text-ink">
                Clients on hold
              </h1>
              <span className="text-[14px] text-ink-faint">
                {Math.max(onHoldClients.length, allHolds.length)}
              </span>
            </div>
            <Link
              href="/holds"
              className="inline-flex items-center gap-1 text-[14px] font-medium text-brand hover:underline"
            >
              Held positions <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          {onHoldClients.length === 0 && allHolds.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
              No clients or positions are on hold right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {onHoldClients.map(renderClientCard)}
              {allHolds
                .filter((h) => !h.clientId || !onHoldClients.some((c) => c.id === h.clientId))
                .map((hold) => {
                  const owner = memberIn(db, hold.ownerId)?.name ?? "Unassigned";
                  const daysHeld = Math.max(
                    1,
                    Math.round((now - (hold.heldAt ?? hold.proposedAt)) / 86_400_000),
                  );
                  return (
                    <RecordCard
                      key={hold.id}
                      href={`/holds/${hold.id}`}
                      chip={{ label: `Hold · ${daysHeld}d`, tone: "warn" }}
                      rightText={hold.state === "proposed" ? "Needs approval" : "Review due"}
                      rightTone="danger"
                      title={hold.openingTaId}
                      subtitle={hold.reason}
                      footerLeft={
                        hold.state === "proposed" ? "Approve notice" : "30-day review"
                      }
                      ownerName={owner}
                    />
                  );
                })}
            </div>
          )}
        </div>
      )}

      {filter === "declined" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-[26px] font-normal leading-[34px] text-ink">
                Declined & closed leads
              </h1>
              <span className="text-[14px] text-ink-faint">{declinedLeads.length}</span>
            </div>
          </div>
          {declinedLeads.length === 0 ? (
            <p className="rounded-[24px] bg-sunk px-6 py-8 text-[15px] text-ink-soft">
              No declined or closed leads.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {declinedLeads.map(renderLeadCard)}
            </div>
          )}
        </div>
      )}

      {/* Default "All" directory view with 3 sections (Figma 1:422) */}
      {filter === "all" && (
        <>
          {/* Section 1: New leads (Figma 1:460) */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-[26px] font-normal leading-[34px] text-ink">New leads</h2>
                <span className="text-[14px] font-normal leading-[21px] text-ink-faint">
                  {newLeads.length}
                </span>
              </div>
              <Link
                href="/clients?filter=leads"
                className="inline-flex items-center gap-1 text-[14px] font-medium leading-[21px] text-brand hover:underline"
              >
                See all <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            {newLeads.length === 0 ? (
              <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
                No new enquiries waiting right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {newLeads.slice(0, 4).map(renderLeadCard)}
              </div>
            )}
          </section>

          {/* Section 2: Agreement in progress (Figma 1:471) */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-[26px] font-normal leading-[34px] text-ink">
                  Agreement in progress
                </h2>
                <span className="text-[14px] font-normal leading-[21px] text-ink-faint">
                  {agreementLeads.length}
                </span>
              </div>
              <Link
                href="/clients?filter=agreements"
                className="inline-flex items-center gap-1 text-[14px] font-medium leading-[21px] text-brand hover:underline"
              >
                See all <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            {agreementLeads.length === 0 ? (
              <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
                No agreements in progress right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {agreementLeads.slice(0, 4).map(renderLeadCard)}
              </div>
            )}
          </section>

          {/* Section 3: Active clients (Figma 1:472) */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-[26px] font-normal leading-[34px] text-ink">
                  Active clients
                </h2>
                <span className="text-[14px] font-normal leading-[21px] text-ink-faint">
                  {activeClientRows.length}
                </span>
              </div>
              <Link
                href="/clients?filter=clients"
                className="inline-flex items-center gap-1 text-[14px] font-medium leading-[21px] text-brand hover:underline"
              >
                See all <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            {activeClientRows.length === 0 ? (
              <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
                No active clients yet. They appear here when an agreement is countersigned or an enquiry links to a TA client.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {activeClientRows.slice(0, 4).map(renderClientCard)}
              </div>
            )}
          </section>
        </>
      )}
    </PageBox>
  );
}
