import "server-only";

import { agreementForLead, leadIn, meetingsForLead, positionIn, requirementIn } from "./desk";
import type { OpsDatabase, OpsPlacement } from "./types";
import { existingClientOf } from "@/lib/leads";
import { type JourneyItem, openingJourney, tailJourney } from "@/lib/leadJourney";

/**
 * The journey bar for the pages of one placement - the placement, its invoice and its
 * guarantee (18 Nov). It finds the lead, the opening, the invoice and the guarantee from
 * the placement, so each of those pages shows the same bar as the lead and the opening
 * instead of its own list of steps.
 */
export function journeyOfPlacement(
  db: OpsDatabase,
  placement: OpsPlacement,
  viewing: "joining" | "invoice" | "guarantee",
): JourneyItem[] {
  const position = placement.positionId ? positionIn(db, placement.positionId) : null;
  const requirement = position?.requirementId ? requirementIn(db, position.requirementId) : null;
  const lead = requirement?.leadId ? leadIn(db, requirement.leadId) : null;
  const esa = lead ? agreementForLead(db, lead.id) : null;
  const invoice = placement.invoiceId ? (db.invoices.find((i) => i.id === placement.invoiceId) ?? null) : null;
  const guarantee = db.guarantees.find((g) => g.placementId === placement.id) ?? null;
  const signed =
    esa?.state === "signed" ||
    esa?.state === "countersigned" ||
    (!!lead && existingClientOf(lead, meetingsForLead(db, lead.id), esa).signedOnFile);

  return openingJourney({
    leadId: lead?.id ?? null,
    // A placement made without a position of ours has nowhere to link back to; the first links drop out.
    positionId: position?.id ?? "",
    agreementSigned: signed,
    openingConfirmed: true,
    tail: tailJourney({
      openingConfirmed: true,
      placed: placement.state !== "cancelled",
      joined: !!placement.joinedAt,
      invoice: invoice?.state ?? null,
      guarantee: guarantee?.state ?? null,
    }),
    placementId: placement.id,
    invoiceId: invoice?.id ?? null,
    guaranteeId: guarantee?.id ?? null,
    viewing,
  });
}
