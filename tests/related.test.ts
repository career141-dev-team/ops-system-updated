/** The links to the rest of a client's work: only what exists, found from whichever page you are on. */
import assert from "node:assert/strict";
import test from "node:test";

import { relatedWork } from "@/data/journeyOf";
import type { OpsDatabase } from "@/data/types";

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
