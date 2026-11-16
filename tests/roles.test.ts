/**
 * Who may do what. One list, read by the screens and by the backend, because
 * this is exactly where the TA System drifted apart for a year.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { can, canPreview, previewList, previewRoleFrom, refusal, ROLE_LABEL, ROLES } from "@/lib/roles";
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

test("View as never gives more than the person has", () => {
  // Everybody may pick their own role, and nobody may pick one with a power they lack.
  for (const role of ROLES) assert.equal(canPreview(role, role), true);
  assert.equal(canPreview("ops_owner", "ops_lead"), false);
  assert.equal(canPreview("ops_owner", "accounts"), false, "money is not an owner's");
  assert.equal(canPreview("ops_owner", "director_ops"), false);
  assert.equal(canPreview("ops_owner", "marketing"), true);
  assert.equal(canPreview("ops_lead", "ops_owner"), true);
  assert.equal(canPreview("ops_lead", "accounts"), true);
  assert.equal(canPreview("ops_lead", "director_ops"), false, "only the Director decides a refund");
  assert.equal(canPreview("marketing", "ops_owner"), false);
  assert.equal(canPreview("director_ro", "ops_owner"), false);
  // Whatever the matrix says, no role may preview a larger part of the desk than their own.
  for (const real of ROLES) for (const as of previewList(real)) {
    for (const cap of ["inbox.read", "task.do", "task.reassign", "message.approve", "client.manage", "money.manage", "refund.decide", "settings.manage", "template.edit", "file.keep", "advert.manage", "report.read"] as const) {
      if (can({ role: as, active: true }, cap)) assert.equal(can({ role: real, active: true }, cap), true, real + " as " + as + " gained " + cap);
    }
  }
  assert.deepEqual(previewList("director_ro").slice(0, 1), ["director_ro"]);
});

test("a View as cookie is only ever a request, asked again each time", () => {
  assert.equal(previewRoleFrom("ops_lead", "accounts"), "accounts");
  assert.equal(previewRoleFrom("ops_lead", "ops_lead"), null, "your own role is no preview");
  assert.equal(previewRoleFrom("ops_owner", "director_ops"), null, "a cookie written for more power is ignored");
  assert.equal(previewRoleFrom("ops_owner", "root"), null);
  assert.equal(previewRoleFrom("ops_owner", undefined), null);
});
