"use client";

import { useState } from "react";

import { assignLeadOwner, moveClientOwner } from "@/app/actions";
import { figmaLabel, pillPrimary } from "@/app/ui/figma";

type OwnerStat = {
  id: string;
  name: string;
  firstName: string;
  clientCount: number;
};

type LeadRow = {
  id: string;
  company: string;
  subtitle: string;
  suggestedOwnerId: string;
};

type ClientRow = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  openCount: number;
};

export function LeadAssignRow({
  lead,
  owners,
  canAssign,
}: {
  lead: LeadRow;
  owners: OwnerStat[];
  canAssign: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>(lead.suggestedOwnerId);

  return (
    <form
      action={assignLeadOwner}
      className="flex flex-wrap items-center justify-between gap-3.5 rounded-[24px] bg-sunk px-[18px] py-3.5"
    >
      <input type="hidden" name="leadId" value={lead.id} />
      <input type="hidden" name="ownerId" value={selectedId} />
      <input type="hidden" name="back" value="/clients/owners" />

      <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-medium leading-[26px] text-ink">
          {lead.company}
        </span>
        <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
          {lead.subtitle}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {owners.map((owner) => {
          const active = selectedId === owner.id;
          return (
            <button
              key={owner.id}
              type="button"
              onClick={() => setSelectedId(owner.id)}
              className={
                "rounded-full px-3 py-1.5 text-[14px] leading-[21px] transition-colors " +
                (active
                  ? "border-[1.5px] border-brand bg-brand-tint font-medium text-ink"
                  : "border border-transparent bg-surface font-normal text-ink-soft hover:text-ink")
              }
            >
              {owner.firstName} · {owner.clientCount}
            </button>
          );
        })}

        {canAssign && (
          <button type="submit" className={pillPrimary}>
            Assign
          </button>
        )}
      </div>
    </form>
  );
}

export function MoveClientCard({
  clients,
  owners,
  canAssign,
}: {
  clients: ClientRow[];
  owners: OwnerStat[];
  canAssign: boolean;
}) {
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id ?? "");
  const currentClient = clients.find((c) => c.id === selectedClientId) ?? clients[0];
  const otherOwners = owners.filter((o) => o.id !== currentClient?.ownerId);
  const [toOwnerId, setToOwnerId] = useState<string>(
    otherOwners[0]?.id ?? owners[0]?.id ?? "",
  );

  return (
    <form
      action={moveClientOwner}
      className="flex flex-col gap-3.5 rounded-[24px] bg-sunk px-6 py-5"
    >
      <input type="hidden" name="back" value="/clients/owners" />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={figmaLabel}>Client</span>
          <select
            name="clientId"
            value={selectedClientId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedClientId(nextId);
              const nextClient = clients.find((c) => c.id === nextId);
              const candidate = owners.find((o) => o.id !== nextClient?.ownerId);
              if (candidate) setToOwnerId(candidate.id);
            }}
            className="rounded-[10px] bg-surface px-3.5 py-2.5 text-[16px] leading-[26px] text-ink outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={figmaLabel}>From</span>
          <div className="rounded-[10px] bg-surface px-3.5 py-2.5 text-[16px] leading-[26px] text-ink-soft">
            {currentClient
              ? `${currentClient.ownerName} · ${currentClient.openCount} ${currentClient.openCount === 1 ? "opening" : "openings"}`
              : "—"}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={figmaLabel}>To</span>
          <select
            name="ownerId"
            value={toOwnerId}
            onChange={(e) => setToOwnerId(e.target.value)}
            className="rounded-[10px] bg-surface px-3.5 py-2.5 text-[16px] leading-[26px] text-ink outline-none"
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.clientCount} clients
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          name="reason"
          defaultValue="Balancing client workload across the Ops team"
          placeholder="Why is this client moving?"
          className="min-w-[240px] flex-1 rounded-[10px] bg-surface px-3.5 py-2 text-[14px] text-ink outline-none"
        />
        {canAssign && (
          <button type="submit" className={pillPrimary}>
            Move client
          </button>
        )}
        <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
          Everything open for that client moves with them.
        </span>
      </div>
    </form>
  );
}
