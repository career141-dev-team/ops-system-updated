/**
 * The ops team's first feedback round (23 Nov): the rules behind the small UI fixes.
 * Each one is pure, so each is tested here without a screen.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { clientForLead } from "@/lib/clients";
import { REJECT_KIND_LABEL, rejectKind, rejectedByKind, type Applicant } from "@/lib/hiring";
import { canDeleteTeamNote } from "@/lib/panelActions";
import type { OpsDatabase } from "@/data/types";

test("a second lead for the same company finds the same client, by name and by TA id", () => {
  const db = {
    clients: [{ id: "c1", leadId: "l1", nameKey: "acme", taClientId: "ta1" }],
    leads: [
      { id: "l1", nameKey: "acme", clientTaId: "ta1" },
      { id: "l2", nameKey: "acme", clientTaId: null },
      { id: "l3", nameKey: "other name", clientTaId: "ta1" },
      { id: "l4", nameKey: "nobody", clientTaId: null },
    ],
  } as unknown as OpsDatabase;
  assert.equal(clientForLead(db, "l1")?.id, "c1");
  assert.equal(clientForLead(db, "l2")?.id, "c1");
  assert.equal(clientForLead(db, "l3")?.id, "c1");
  assert.equal(clientForLead(db, "l4"), null);
  assert.equal(clientForLead(db, "missing"), null);
});

const person = (id: string, stage: Applicant["stage"], at: string | null, since: number): Applicant => ({
  id, name: id, source: "", phone: null, stage, since, detail: "", rejectedAtStage: at, rejectReason: "reason " + id,
});

test("a rejection before an interview is a screening reject, after one a final reject", () => {
  assert.equal(rejectKind("call"), "screening");
  assert.equal(rejectKind("fits"), "screening");
  assert.equal(rejectKind("interview"), "final");
  assert.equal(rejectKind("decision"), "final");
  assert.equal(rejectKind(null), "screening");
  const groups = rejectedByKind([
    person("a", "rejected", "fits", 1),
    person("b", "rejected", "interview", 2),
    person("c", "rejected", "call", 3),
    person("d", "fits", null, 4),
  ]);
  assert.deepEqual(groups.screening.map((a) => a.id), ["c", "a"]);
  assert.deepEqual(groups.final.map((a) => a.id), ["b"]);
  assert.equal(REJECT_KIND_LABEL.final, "Final reject");
});

test("an Ops lead can delete anybody's team note, an Ops person only their own", () => {
  const note = { authorId: "a" };
  assert.equal(canDeleteTeamNote(note, "a"), true);
  assert.equal(canDeleteTeamNote(note, "b"), false);
  assert.equal(canDeleteTeamNote(note, "b", true), true);
  assert.equal(canDeleteTeamNote(undefined, "a", true), false);
});
