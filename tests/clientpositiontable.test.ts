/**
 * Who may be made main or backup Ops on a position.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { problemWithNewBackup, problemWithNewHandler } from "@/lib/clientPositionTable";

const db = {
  members: [{ id: "m1", name: "Rakshana", active: true, role: "ops_owner" }, { id: "m2", name: "Haifa", active: true, role: "ops_lead" }, { id: "m3", name: "Gone", active: false, role: "ops_owner" }, { id: "m4", name: "Sales", active: true, role: "ta" }],
};

test("a new handler must be an active member, a different one, with a reason", () => {
  const m = db.members;
  assert.equal(problemWithNewHandler("m2", "m1", m, "Rakshana is on leave"), null);
  assert.match(problemWithNewHandler("nobody", "m1", m, "reason here") ?? "", /team/);
  assert.match(problemWithNewHandler("m3", "m1", m, "reason here") ?? "", /team/);
  assert.match(problemWithNewHandler("m1", "m1", m, "reason here") ?? "", /already/);
  assert.match(problemWithNewHandler("m2", "m1", m, "no") ?? "", /why/i);
});

test("a backup must be an active Ops person other than the main one", () => {
  const m = db.members;
  assert.equal(problemWithNewBackup("m2", "m1", m), null);
  assert.match(problemWithNewBackup("m1", "m1", m) ?? "", /other/);
  assert.match(problemWithNewBackup("m3", "m1", m) ?? "", /Ops person/);
  assert.match(problemWithNewBackup("m4", "m1", m) ?? "", /Ops person/);
  assert.match(problemWithNewBackup("zz", "m1", m) ?? "", /Ops person/);
});
