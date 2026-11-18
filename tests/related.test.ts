/** The links to the rest of a client's work: only what exists, found from whichever page you are on. */
import assert from "node:assert/strict";
import test from "node:test";

import { positionStanding, relatedWork } from "@/data/journeyOf";
import type { OpsDatabase, OpsPosition } from "@/data/types";

function db(): OpsDatabase {
  return {
    requirements: [{ id: "r1", leadId: "l1" }],
    leads: [{ id: "l1" }],
    positions: [{ id: "p1", requirementId: "r1" }],
    placements: [
      { id: "pl0", positionId: "p1", state: "cancelled", invoiceId: null },
      { id: "pl1", positionId: "p1", state: "joined", invoiceId: "i1" },
    ],
    invoices: [{ id: "i1" }],
    guarantees: [{ id: "g1", placementId: "pl1" }],
  } as unknown as OpsDatabase;
}

test("from the lead, the opening, the placement, its invoice and its guarantee are all one click away", () => {
  const keys = (items: { key: string }[]) => items.map((i) => i.key);
  const expected = ["lead", "opening", "placement", "invoice", "guarantee"];
  assert.deepEqual(keys(relatedWork(db(), { leadId: "l1" })), expected);
  // The same list from the opening, the placement, and the other direction.
  assert.deepEqual(keys(relatedWork(db(), { positionId: "p1" })), expected);
  assert.deepEqual(keys(relatedWork(db(), { placementId: "pl1" })), expected);
  // A cancelled placement is not one of the client's pieces of work.
  assert.equal(relatedWork(db(), { positionId: "p1" }).find((i) => i.key === "placement")?.href, "/placements/pl1");
});

test("nothing that does not exist yet is listed", () => {
  const early = { ...db(), placements: [], invoices: [], guarantees: [] } as unknown as OpsDatabase;
  assert.deepEqual(relatedWork(early, { leadId: "l1" }).map((i) => i.key), ["lead", "opening"]);
  const justLead = { ...early, positions: [] } as unknown as OpsDatabase;
  assert.deepEqual(relatedWork(justLead, { leadId: "l1" }).map((i) => i.key), ["lead"]);
});

test("where an opening stands after it was opened: the furthest it has got", () => {
  const base = {
    clientSets: [],
    holds: [],
    closeChecklists: [],
    interviews: [],
    placements: [] as unknown[],
    invoices: [] as unknown[],
    guarantees: [] as unknown[],
  };
  const position = { id: "p1", openingTaId: "ta1", stage: "open" } as unknown as OpsPosition;
  const standing = (over: object) => positionStanding({ ...base, ...over } as unknown as OpsDatabase, position).stage;
  assert.equal(standing({}), "in_search");
  const placed = { id: "pl1", openingTaId: "ta1", state: "placed", joinedAt: null };
  assert.equal(standing({ placements: [placed] }), "joining");
  const joined = { ...placed, state: "joined", joinedAt: 1 };
  assert.equal(standing({ placements: [joined] }), "money");
  // A running guarantee is the furthest it has got, whether or not the invoice is paid yet.
  const guarantee = { placementId: "pl1", state: "running" };
  assert.equal(standing({ placements: [joined], invoices: [{ placementId: "pl1", state: "sent" }], guarantees: [guarantee] }), "guarantee");
  assert.equal(standing({ placements: [joined], invoices: [{ placementId: "pl1", state: "paid" }], guarantees: [guarantee] }), "guarantee");
  // A cancelled placement does not move it on.
  assert.equal(standing({ placements: [{ ...placed, state: "cancelled" }] }), "in_search");
  // In search it also says what the loop holds.
  assert.match(positionStanding({ ...base } as unknown as OpsDatabase, position).loop?.line ?? "", /Search active/);
});
