/**
 * The client record (15, Phase 2 step 19).
 *
 * A lead is somebody who asked. A client is a company we work for, and from
 * the requirement meeting onwards everything hangs off this record: who owns
 * them, who we invoice, which WhatsApp group is theirs, and whether they are
 * live, quiet or finished.
 *
 * The board's reason for having it at all: today the owner of a client lives
 * in whoever remembers, the billing contact lives in Asma's inbox, and the
 * group is whichever one somebody created. One record, one owner.
 *
 * Nothing here touches a database or sends anything.
 */
import type { OpsClient, OpsDatabase } from "@/data/types";

export type ClientStage = "lead" | "onboarding" | "active" | "dormant" | "closed";

export const STAGE_MEANINGS: Record<ClientStage, string> = {
  lead: "Known to us, nothing agreed yet",
  onboarding: "Agreement out, not signed by both",
  active: "Agreement done — we work for them",
  dormant: "Quiet. Nothing open, nothing closed",
  closed: "Finished with, for now",
};

/** Where a client can go from where they are. Anything else is refused. */
const NEXT: Record<ClientStage, ClientStage[]> = {
  lead: ["onboarding", "active", "closed"],
  onboarding: ["active", "dormant", "closed"],
  // Active to lead is never right: they have a signed agreement behind them.
  active: ["dormant", "closed"],
  dormant: ["active", "closed"],
  closed: ["active"],
};

export function canMoveStage(from: ClientStage, to: ClientStage): boolean {
  return NEXT[from].includes(to);
}

/**
 * Moving a client by hand.
 *
 * The owner's rule is that nothing closes without a reason, and going quiet
 * is a kind of closing: in three months somebody will ask why this client
 * stopped, and "it was moved" is not an answer.
 */
export function problemWithStageMove(from: ClientStage, to: ClientStage, reason: string): string | null {
  if (from === to) return "They are already there.";
  if (!canMoveStage(from, to)) {
    return "They cannot be moved there from here. Where they are now: " + STAGE_MEANINGS[from] + ".";
  }
  if ((to === "dormant" || to === "closed") && reason.trim().length < 4) {
    return "Write why. Nothing goes quiet or closes without a reason.";
  }
  return null;
}

/** The stage a signed-and-countersigned agreement puts them at. */
export const STAGE_AFTER_COUNTERSIGN: ClientStage = "active";

export interface BillingDetails {
  billingName: string;
  billingEmail: string;
  groupName: string;
  billingAddress?: string;
}

/**
 * The invoice has to reach a person who pays it.
 *
 * Not required while they are onboarding - we often do not know yet - but an
 * address that is not an address is worse than a blank one, because nobody
 * checks a field that looks filled in.
 */
export function problemWithBilling(details: BillingDetails): string | null {
  const email = details.billingEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That billing email does not look like an email.";
  if (email && !details.billingName.trim()) return "Say who the billing contact is, not only their address.";
  return null;
}

/**
 * The gate before an invoice is drafted or sent (16 Nov, FigJam "Billing
 * address exists? No: fix client billing record").
 *
 * Strict where problemWithBilling is lenient: an invoice with no address on it
 * is not an invoice a client can pay against, so all three are named at once.
 */
export function problemWithInvoiceBilling(client: {
  billingName: string;
  billingAddress?: string;
  billingEmail: string;
}): string | null {
  const missing: string[] = [];
  if (!client.billingName.trim()) missing.push("billing name");
  if (!(client.billingAddress ?? "").trim()) missing.push("billing address");
  if (!client.billingEmail.trim()) missing.push("billing email");
  if (!missing.length) return null;
  return "The client record is missing the " + missing.join(", ") + ". Fix it on the client page first, then the invoice can go.";
}

/** One line for the list: where they are and what is missing. */
export function whereTheyStand(client: {
  stage: string;
  billingEmail: string;
  groupName: string;
  reason: string | null;
}): string {
  const stage = STAGE_MEANINGS[client.stage as ClientStage] ?? client.stage;
  const missing: string[] = [];
  if (!client.billingEmail.trim()) missing.push("no billing contact");
  if (!client.groupName.trim()) missing.push("no WhatsApp group");
  const tail = missing.length ? " · " + missing.join(", ") : "";
  const why = client.reason ? " · " + client.reason : "";
  return stage + tail + why;
}

/**
 * Which call a client's page offers (23 Nov, the owner): the intro call is for a client we have not worked
 * for yet, and the requirement call for one opening a new role. Never both, so the two do not overlap.
 * A client is "new" until a call has been held with them or they have a position.
 */
export function callKindFor(c: { stage: string; hasPosition: boolean; heldCall: boolean }): "intro" | "requirement" {
  return c.stage === "lead" && !c.hasPosition && !c.heldCall ? "intro" : "requirement";
}

/** Renaming a client (23 Nov): one company, one record, so a name another client already has is refused. */
export function problemWithClientRename(name: string, clash: boolean): string | null {
  if (name.trim().length < 2) return "Write the client's name.";
  if (clash) return "Another client already has that name. One company has one record.";
  return null;
}

/**
 * The client a lead belongs to. A returning company keeps its first lead's id on its record, so a second
 * lead finds it by name or by the TA client, the same way the desk makes one (23 Nov: a position made from
 * the second lead had no client and showed under no client at all).
 */
export function clientForLead(db: OpsDatabase, leadId: string): OpsClient | null {
  const byLead = db.clients.find((c) => c.leadId === leadId);
  if (byLead) return byLead;
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  return (
    db.clients.find((c) => c.nameKey === lead.nameKey) ??
    (lead.clientTaId ? db.clients.find((c) => c.taClientId === lead.clientTaId) : undefined) ??
    null
  );
}
