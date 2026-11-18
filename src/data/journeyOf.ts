import "server-only";

import { leadIn, placementIn, positionIn, requirementForLead, requirementIn } from "./desk";
import type { OpsDatabase } from "./types";

export type RelatedKey = "lead" | "opening" | "placement" | "invoice" | "guarantee";

/**
 * The other pieces of one client's work, as plain links (18 Nov).
 *
 * The owner dropped the progress bar: a person moves between the lead, its opening, the
 * placement, the invoice and the guarantee freely, and the page's "next step" card (from
 * `leadNextStep` and friends) says what comes next, so nothing here draws progress. Only what
 * exists is listed; a placement that has not happened yet is not a greyed-out step.
 *
 * Start from whichever page you are on: the chain is followed up to the lead (placement ->
 * opening -> requirement -> lead) and down again (opening -> placement -> invoice, guarantee).
 */
export function relatedWork(
  db: OpsDatabase,
  from: { leadId?: string | null; positionId?: string | null; placementId?: string | null },
): { key: RelatedKey; label: string; href: string }[] {
  let placement = from.placementId ? placementIn(db, from.placementId) : null;
  let position = from.positionId
    ? positionIn(db, from.positionId)
    : placement?.positionId
      ? positionIn(db, placement.positionId)
      : null;
  const requirement = position?.requirementId
    ? requirementIn(db, position.requirementId)
    : from.leadId
      ? requirementForLead(db, from.leadId)
      : null;
  const lead = requirement?.leadId ? leadIn(db, requirement.leadId) : from.leadId ? leadIn(db, from.leadId) : null;
  if (!position && requirement) position = db.positions.find((p) => p.requirementId === requirement.id) ?? null;
  if (!placement && position) {
    placement = db.placements.find((p) => p.positionId === position!.id && p.state !== "cancelled") ?? null;
  }
  const invoice = placement?.invoiceId ? (db.invoices.find((i) => i.id === placement!.invoiceId) ?? null) : null;
  const guarantee = placement ? (db.guarantees.find((g) => g.placementId === placement!.id) ?? null) : null;

  const items: { key: RelatedKey; label: string; href: string }[] = [];
  if (lead) items.push({ key: "lead", label: "Lead", href: `/leads/${lead.id}` });
  if (position) items.push({ key: "opening", label: "Opening", href: `/positions/${position.id}` });
  if (placement) items.push({ key: "placement", label: "Placement", href: `/placements/${placement.id}` });
  if (invoice) items.push({ key: "invoice", label: "Invoice", href: `/invoices/${invoice.id}` });
  if (guarantee) items.push({ key: "guarantee", label: "Guarantee", href: `/guarantees/${guarantee.id}` });
  return items;
}
