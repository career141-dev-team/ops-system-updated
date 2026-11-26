/**
 * The client and position table (23 Nov, the ops team's feedback): the sheet the team kept to see, for
 * every client, each position, its package and which Ops person is handling it.
 *
 * A position has no package of its own. It is what the client said in the requirement (the "salary"
 * field, labelled Package), and once somebody is placed it is the package TA recorded for them. Both
 * are free text, kept as written, never turned into a number here.
 *
 * Pure: it reads the desk's rows. Nothing is saved from here.
 */
import { positionValue } from "@/lib/clients";
import { COUNT_KINDS, countItems, type CountKind } from "@/lib/positionCounts";
import { requirementLocked } from "@/lib/requirements";
import type { OpsDatabase } from "@/data/types";

export interface PositionRow {
  positionId: string;
  clientId: string | null;
  client: string;
  position: string;
  /** The package as written, or "" when nobody has written one down. */
  pack: string;
  /** Where the package came from, so the screen can say so. */
  packFrom: "requirement" | "placement" | "none";
  /** True when the requirement is complete and locked, so the package cannot be edited here. */
  packLocked: boolean;
  hasRequirement: boolean;
  handlerId: string;
  handler: string;
  stage: string;
  // 26 Nov (Nov 25 ops meeting): backup, TAs, counts, value, priority.
  backupId: string;
  backup: string;
  clientType: "local" | "international" | "";
  tas: string;
  /** Each count is the length of the list its pop-up shows (positionCounts.ts). */
  counts: Record<CountKind, number>;
  value: number | null;
  currency: string;
  priority: "P1" | "P2" | "P3" | "";
  salaryMonthly: number | null;
}

/** `taName` turns a TA id into a name; an id it cannot name is shown as it is. */
export function positionRows(db: OpsDatabase, taName: (id: string) => string | null = () => null): PositionRow[] {
  const rows: PositionRow[] = db.positions.map((p) => {
    const client = p.clientId ? db.clients.find((c) => c.id === p.clientId) : null;
    const requirement = p.requirementId ? db.requirements.find((r) => r.id === p.requirementId) : null;
    const written = (requirement?.fields.salary ?? "").trim();
    const placed = db.placements.find((x) => x.positionId === p.id && x.package?.trim() && x.state !== "cancelled" && x.state !== "no_show");
    const pack = written || placed?.package?.trim() || "";
    return {
      positionId: p.id,
      clientId: p.clientId,
      client: client?.name ?? p.clientTaId ?? "Client",
      position: p.title,
      pack,
      packFrom: written ? "requirement" : placed ? "placement" : "none",
      packLocked: requirement ? requirementLocked(requirement.fields) : false,
      hasRequirement: !!requirement,
      handlerId: p.ownerId,
      handler: db.members.find((m) => m.id === p.ownerId)?.name ?? "Nobody",
      stage: p.stage,
      backupId: p.backupOwnerId ?? "",
      backup: p.backupOwnerId ? (db.members.find((m) => m.id === p.backupOwnerId)?.name ?? "—") : "—",
      clientType: client?.clientType ?? "",
      tas: [...new Set([p.primaryTaId, ...(p.team ?? []).map((t) => t.taId)].filter((x): x is string => !!x))].map((id) => taName(id) ?? id).join(", ") || "—",
      counts: Object.fromEntries(COUNT_KINDS.map((k) => [k, countItems(db, p.id, k).length])) as Record<CountKind, number>,
      value: positionValue(db, p),
      currency: p.salaryCurrency ?? "",
      priority: p.priority ?? "",
      salaryMonthly: p.salaryMonthly ?? null,
    };
  });
  return rows.sort((a, b) => a.client.localeCompare(b.client) || a.position.localeCompare(b.position));
}

export interface PositionFilters {
  type?: string;
  min?: string;
  max?: string;
  /** The currency min and max are in. Blank means LKR, and so does a row with no currency written. */
  currency?: string;
  priority?: string;
  backup?: string;
}

/** Every word of the search must appear in the client, the position, the package or the handler's name. */
export function filterPositionRows(rows: PositionRow[], q: string, handlerId: string, f: PositionFilters = {}): PositionRow[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const min = f.min?.trim() ? Number(f.min) : null;
  const max = f.max?.trim() ? Number(f.max) : null;
  return rows.filter((r) => {
    if (handlerId && r.handlerId !== handlerId) return false;
    if (f.type && r.clientType !== f.type) return false;
    if (f.priority && r.priority !== f.priority) return false;
    if (f.backup && r.backupId !== f.backup) return false;
    // A row with no value cannot be inside a range, so a bound drops it.
    if ((min !== null && Number.isFinite(min)) || (max !== null && Number.isFinite(max))) {
      if (r.value === null) return false;
      // Amounts in different currencies are never compared.
      if ((r.currency || "LKR") !== (f.currency || "LKR")) return false;
      if (min !== null && Number.isFinite(min) && r.value < min) return false;
      if (max !== null && Number.isFinite(max) && r.value > max) return false;
    }
    const text = [r.client, r.position, r.pack, r.handler].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Why a handler change is refused, or null. A handler must be a member of the team, and the reason is kept. */
export function problemWithNewHandler(newId: string, currentId: string, members: { id: string; active: boolean }[], reason: string): string | null {
  const m = members.find((x) => x.id === newId);
  if (!m || !m.active) return "Pick somebody on the team.";
  if (newId === currentId) return "That person already handles it.";
  if (reason.trim().length < 4) return "Say why the handler is changing. It is kept with the change.";
  return null;
}

/** Why a backup is refused, or null. Blank removes the backup, so it is not asked here. */
export function problemWithNewBackup(backupId: string, mainId: string, members: { id: string; active: boolean; role: string }[]): string | null {
  const m = members.find((x) => x.id === backupId);
  if (!m || !m.active || !["ops_owner", "ops_lead", "admin"].includes(m.role)) return "Pick an active Ops person.";
  if (backupId === mainId) return "The backup has to be somebody other than the main Ops person.";
  return null;
}

/** "LKR 1,200,000", or "—". */
export function moneyText(value: number | null, currency: string): string {
  return value === null ? "—" : (currency ? currency + " " : "") + value.toLocaleString("en-US");
}
