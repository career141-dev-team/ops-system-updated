import Link from "next/link";
import { redirect } from "next/navigation";

import { LeadAssignRow, MoveClientCard } from "@/app/(clients)/clients/owners/OwnersClient";
import Icon from "@/app/Icon";
import { Avatar, BackBar, Card, PageTitle } from "@/app/ui/figma";
import {
  activeMembers,
  clientsNewestFirst,
  desk,
  leadsNewestFirst,
  member as memberIn,
} from "@/data/desk";
import { SOURCE_MEANINGS } from "@/lib/leads";
import { day } from "@/lib/listing";
import { ASSIGNABLE_ROLES, can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * CL · Owners — assign and move clients (Asma, ops lead) (Figma frame 1:3773).
 */
export default async function ClientOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { msg } = await searchParams;
  const canAssign = can(me, "task.reassign");

  const db = await desk();
  const now = Date.now();
  const members = activeMembers(db);
  // 26 Nov: "ops" is not a role, so this list was always empty and fell back to everyone. Same people as the positions picker.
  const opsMembers = members.filter((m) => ASSIGNABLE_ROLES.includes(m.role));
  const team = opsMembers.length > 0 ? opsMembers : members;

  const ownerStats = team.map((m) => {
    const clientCount = db.clients.filter(
      (c) => c.ownerId === m.id && c.stage !== "closed",
    ).length;
    const lateTasks = db.tasks.filter(
      (t) => t.assigneeId === m.id && t.state !== "done" && t.dueAt < now,
    ).length;
    const lateTimers = db.timers.filter(
      (t) => t.ownerId === m.id && t.state === "running" && t.dueAt < now,
    ).length;
    return {
      id: m.id,
      name: m.name,
      firstName: m.name.split(/\s+/)[0] ?? m.name,
      clientCount,
      lateCount: lateTasks + lateTimers,
    };
  });

  // Suggest the owner with the fewest clients
  const suggestedOwner =
    [...ownerStats].sort((a, b) => a.clientCount - b.clientCount)[0] ?? ownerStats[0];

  const openLeads = leadsNewestFirst(db).filter(
    (l) => l.state === "new" || l.state === "intro_call",
  );

  const clientRows = clientsNewestFirst(db).map((c) => ({
    id: c.id,
    name: c.name,
    ownerId: c.ownerId,
    ownerName: memberIn(db, c.ownerId)?.name ?? "Unassigned",
    openCount: db.positions.filter((p) => p.clientId === c.id && p.stage !== "closed")
      .length,
  }));

  return (
    <div className="flex flex-col gap-[22px]">
      <BackBar href="/clients" label="Clients" />

      <PageTitle title="Who owns what" sub="Every client has one Ops owner, and Ops owners see only the clients you give them." />

      {msg && (
        <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>
      )}

      <Link href="/clients/positions" className="t-label w-fit text-brand hover:underline">
        Assign ops to positions
      </Link>

      {/* Section 1: WAITING FOR AN OWNER (Figma 1:3786) */}
      <Card title="Waiting for an owner" sub={`${openLeads.length} open`}>

        {openLeads.length === 0 ? (
          <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
            Every open lead has been assigned.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {openLeads.map((lead) => {
              const sourceLabel =
                SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ??
                lead.source;
              return (
                <LeadAssignRow
                  key={lead.id}
                  lead={{
                    id: lead.id,
                    company: lead.company,
                    subtitle: `${sourceLabel} · ${day(lead.createdAt)}${lead.industry ? " · " + lead.industry : ""}${lead.notes ? " · " + lead.notes : ""}`,
                    suggestedOwnerId: suggestedOwner?.id ?? lead.ownerId,
                  }}
                  owners={ownerStats}
                  canAssign={canAssign}
                />
              );
            })}
          </div>
        )}

        <p className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
          <Icon name="sparkle" size={14} className="text-brand" />
          <span>
            Suggested: the owner with the fewest clients. The number is how many clients each one has.
          </span>
        </p>
      </Card>

      {/* Section 2: YOUR TEAM (Figma 1:3833) */}
<Card title="Your team">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 pg-lg:grid-cols-4">
          {ownerStats.map((owner) => (
            <div
              key={owner.id}
              className="flex flex-col gap-2.5 rounded-[24px] bg-sunk px-5 py-[18px]"
            >
              <div className="flex items-center gap-3">
                <Avatar name={owner.name} size="40" tone="brand" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-medium leading-[26px] text-ink">
                    {owner.name}
                  </span>
                  <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
                    {owner.clientCount}{" "}
                    {owner.clientCount === 1 ? "client" : "clients"}
                  </span>
                </div>
              </div>
              <span
                className={
                  "text-[14px] font-normal leading-[21px] " +
                  (owner.lateCount > 0 ? "text-danger" : "text-ink-faint")
                }
              >
                {owner.lateCount > 0 ? `${owner.lateCount} late` : "Nothing late"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 3: MOVE A CLIENT (Figma 1:3854) */}
<Card title="Move a client">
        {clientRows.length === 0 ? (
          <p className="rounded-[24px] bg-sunk px-6 py-5 text-[14px] text-ink-soft">
            No active clients to move yet.
          </p>
        ) : (
          <MoveClientCard
            clients={clientRows}
            owners={ownerStats}
            canAssign={canAssign}
          />
        )}
      </Card>
    </div>
  );
}
