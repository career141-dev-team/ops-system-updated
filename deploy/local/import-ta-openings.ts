/**
 * The TA System's clients and openings into the desk, read-only (9 Nov).
 *
 *   OPS_DATA_DIR=.local/real-data OPS_TA_READS_ENABLED=on \
 *     node --experimental-strip-types --import ./tests/alias.mjs deploy/local/import-ta-openings.ts
 *
 * The owner: "get the client and position details from Aura, it has every
 * opening and client". Aura is the TA System. This reads its Ops API
 * (/integrations/v1/people, /clients, /openings) with OPS_TA_TOKEN and
 * writes nothing there.
 *
 * Here it:
 *   - ties each TA client to ours by name (the same name key the duplicate
 *     check uses), or adds it; the TA id goes on the client, and a TA
 *     contact's address fills an empty one, so their mail files itself;
 *   - adds each live opening as a position with its TA opening id, so the
 *     events that follow (sets, stages, placements) land on it rather than
 *     on a second copy; the owner is the client's ops owner;
 *   - never changes a position that already carries that opening id, and
 *     can be run again: the second run adds nothing.
 */
import { addClient, addPosition, desk, patchClient } from "@/data/desk";
import { nameKey } from "@/lib/leads";
import { type TaOpening, clients as taClients, openings as taOpenings, people as taPeople, readsEnabled, fakeTa } from "@/lib/ta";

if (!readsEnabled() && !fakeTa()) throw new Error("Set OPS_TA_READS_ENABLED=on (and OPS_TA_TOKEN, OPS_TA_BASE_URL).");

const [pp, cc] = await Promise.all([taPeople(), taClients("")]);
for (const [what, r] of [["people", pp], ["clients", cc]] as const) {
  if (!r.ok) throw new Error("The TA System would not give us its " + what + ": " + r.reason);
}
const people = pp.ok ? pp.data : [];
const tclients = cc.ok ? cc.data : [];
// Client by client (9 Nov): the unfiltered list is the newest 100 openings
// only (OPS_READ_LIMIT on the TA side), so the first run missed the older ones.
const topenings: TaOpening[] = [];
for (const t of tclients) {
  const r = await taOpenings(t.id);
  if (!r.ok) throw new Error("The TA System would not give us " + t.name + "'s openings: " + r.reason);
  topenings.push(...r.data);
  if (r.data.length >= 100) console.log("  ! " + t.name + " has 100 openings or more; only the first 100 were read.");
}

let db = await desk();
const lead = db.members.find((m) => m.role === "ops_lead" && m.active) ?? db.members[0];
const memberByEmail = (email: string | undefined | null) =>
  email ? db.members.find((m) => m.email.toLowerCase() === email.toLowerCase()) : undefined;
const personEmail = (id: string | null) => people.find((p) => p.id === id)?.email ?? null;

const said = { tied: 0, added: 0, addressed: 0, positions: 0, skipped: 0 };
const clientFor = new Map<string, string>(); // TA client id -> our client id

for (const t of tclients) {
  const key = nameKey(t.name);
  let ours = db.clients.find((c) => c.taClientId === t.id) ?? db.clients.find((c) => c.nameKey === key);
  const owner = memberByEmail(personEmail(t.opsOwnerId)) ?? (ours ? db.members.find((m) => m.id === ours!.ownerId) : undefined) ?? lead;
  const contact = (t.contacts ?? []).find((c) => c.email?.includes("@"))?.email ?? "";
  if (!ours) {
    ours = await addClient({
      leadId: null, taClientId: t.id, name: t.name, nameKey: key, stage: t.status === "inactive" ? "dormant" : "active",
      billingName: t.name, billingEmail: contact, groupName: "",
      notes: "From the TA System (9 Nov).", reason: null, ownerId: owner.id,
    } as never);
    said.added += 1;
  } else {
    // Ours already: the TA id and, where we had none, an address. Nothing else is overwritten.
    const patch: Record<string, unknown> = {};
    if (!ours.taClientId) patch.taClientId = t.id;
    if (!ours.billingEmail && contact) { patch.billingEmail = contact; said.addressed += 1; }
    if (Object.keys(patch).length) {
      await patchClient(ours.id, patch as never, lead.id, "client.linkedToTa", "Matched by name to the TA System's client");
      Object.assign(ours, patch);
    }
    said.tied += 1;
  }
  clientFor.set(t.id, ours.id);
  db = await desk();
}

for (const o of topenings) {
  // The TA System's own words: active, hold, filled, lost (and draft/open on older rows).
  const live = ["active", "open", "draft", "hold", "on_hold"].includes(o.status);
  if (!live) continue;
  if (db.positions.some((p) => p.openingTaId === o.id)) { said.skipped += 1; continue; }
  const clientId = clientFor.get(o.clientId) ?? null;
  const client = db.clients.find((c) => c.id === clientId);
  await addPosition({
    requirementId: null, clientId, clientTaId: o.clientId, openingTaId: o.id, title: o.title,
    stage: o.status === "hold" || o.status === "on_hold" ? "on_hold" : "searching",
    primaryTaId: o.primaryRecruiterId, hundredPercentDay: null, taStatus: o.status,
    jdApprovedAt: null, linkedInUrl: null, linkedInPostedAt: null,
    depthStage: null, shortlistedTotal: null, pendingCount: null, depthCheckedAt: null,
    handedOverAt: o.assignedAt ?? Date.now(), closedAt: null,
    ownerId: client?.ownerId ?? lead.id,
  } as never);
  said.positions += 1;
  db = await desk();
}

console.log(`TA System: ${people.length} people, ${tclients.length} clients, ${topenings.length} openings.`);
console.log(`Clients: ${said.tied} tied to ours, ${said.added} added, ${said.addressed} given an address.`);
console.log(`Positions: ${said.positions} added from live openings, ${said.skipped} already here.`);
