/** Candidates added by hand, and no invented people on a real opening. */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsPosition } from "@/data/types";
import { candidatesForPosition } from "@/lib/positionCandidates";

const position = {
  id: "pos1",
  title: "Driver",
  requirementId: null,
  manualCandidates: [
    { id: "mc1", name: "Nimal Silva", email: "nimal@example.test", phone: "", note: "Driver, 6 yrs", cvFileId: null, addedBy: "m1", at: 1 },
  ],
} as unknown as OpsPosition;
const db = { requirements: [], interviews: [], placements: [] } as unknown as OpsDatabase;

test("a person added by hand shows on the list, marked, with no fit score invented", () => {
  delete process.env.OPS_TA_FAKE;
  const list = candidatesForPosition(db, position, []);
  assert.equal(list.length, 1);
  assert.equal(list[0].manual, true);
  assert.equal(list[0].id, "manual:mc1");
  assert.equal(list[0].statusLabel, "Added by hand, not in TA");
  assert.equal(list[0].fit, 0);
});

test("the invented sample people appear only while the stand-in TA System is on", () => {
  const empty = { ...position, manualCandidates: [] } as unknown as OpsPosition;

  delete process.env.OPS_TA_FAKE;
  assert.equal(candidatesForPosition(db, empty, []).length, 0);

  process.env.OPS_TA_FAKE = "on";
  assert.ok(candidatesForPosition(db, empty, []).length > 0);
  delete process.env.OPS_TA_FAKE;
});
