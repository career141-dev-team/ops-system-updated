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
}

export function positionRows(db: OpsDatabase): PositionRow[] {
  const rows: PositionRow[] = db.positions.map((p) => {
    const client = p.clientId ? db.clients.find((c) => c.id === p.clientId) : null;
    const requirement = p.requirementId ? db.requirements.find((r) => r.id === p.requirementId) : null;
    const written = (requirement?.fields.salary ?? "").trim();
    const placed = db.placements.find((x) => x.positionId === p.id && x.package.trim() && x.state !== "cancelled" && x.state !== "no_show");
    const pack = written || placed?.package.trim() || "";
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
    };
  });
  return rows.sort((a, b) => a.client.localeCompare(b.client) || a.position.localeCompare(b.position));
}

/** Every word of the search must appear in the client, the position, the package or the handler's name. */
export function filterPositionRows(rows: PositionRow[], q: string, handlerId: string): PositionRow[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (handlerId && r.handlerId !== handlerId) return false;
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
