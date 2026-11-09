/**
 * Who may do what. One list, read by the screens and by the backend, because
 * this is exactly where the TA System drifted apart for a year.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { can, refusal, ROLE_LABEL } from "@/lib/roles";
import type { OpsRole } from "@/data/types";

const member = (role: OpsRole, active = true) => ({ role, active });

test("an ops owner runs their clients but does not touch the money", () => {
  assert.equal(can(member("ops_owner"), "message.approve"), true);
  assert.equal(can(member("ops_owner"), "client.manage"), true);
  assert.equal(can(member("ops_owner"), "money.manage"), false);
  assert.equal(can(member("ops_owner"), "settings.manage"), false);
});

test("the ops lead can do everything an owner can, and move work about", () => {
  assert.equal(can(member("ops_lead"), "task.reassign"), true);
  assert.equal(can(member("ops_lead"), "settings.manage"), true);
  assert.equal(can(member("ops_owner"), "task.reassign"), false);
});

test("accounts keeps the money, and only the Director of Operations decides a refund", () => {
  assert.equal(can(member("accounts"), "money.manage"), true);
  assert.equal(can(member("accounts"), "refund.decide"), false);
  assert.equal(can(member("director_ops"), "refund.decide"), true);
  assert.equal(can(member("ops_lead"), "refund.decide"), false);
});

test("the read-only roles read reports and nothing else", () => {
  for (const role of ["director_ro", "ta_lead_ro"] as const) {
    assert.equal(can(member(role), "report.read"), true, role);
    assert.equal(can(member(role), "message.approve"), false, role);
    assert.equal(can(member(role), "task.do"), false, role);
  }
});

test("a deactivated person may do nothing at all", () => {
  assert.equal(can(member("ops_lead", false), "inbox.read"), false);
  assert.equal(can(member("ops_lead", false), "settings.manage"), false);
});

test("every role has a label, and refusals are sentences", () => {
  for (const role of Object.keys(ROLE_LABEL) as OpsRole[]) {
    assert(ROLE_LABEL[role].length > 0, role);
  }
  assert.match(refusal("refund.decide"), /Director of Operations/);
  assert.match(refusal("money.manage"), /accounts/);
});

test("the ops lead and the Director open on the whole desk; an ops owner on their own box (9 Nov)", async () => {
  const { seesWholeDesk } = await import("@/lib/roles");
  assert.equal(seesWholeDesk({ role: "ops_lead" }), true);
  assert.equal(seesWholeDesk({ role: "director_ops" }), true);
  assert.equal(seesWholeDesk({ role: "ops_owner" }), false);
  assert.equal(seesWholeDesk({ role: "accounts" }), false);
});
