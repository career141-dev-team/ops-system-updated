import assert from "node:assert/strict";
import test from "node:test";

import { adminEmailsFrom, clerkConfigured, resolveClerkDoor } from "@/lib/clerkAuth";
import { ASSIGNABLE_ROLES, ROLE_LABEL, can, canPreview, seesWholeDesk } from "@/lib/roles";

test("clerkConfigured requires both publishable and secret keys", () => {
  assert.equal(clerkConfigured({}), false);
  assert.equal(clerkConfigured({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123" }), false);
  assert.equal(clerkConfigured({ CLERK_SECRET_KEY: "sk_test_123" }), false);
  assert.equal(
    clerkConfigured({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123", CLERK_SECRET_KEY: "sk_test_123" }),
    true,
  );
});

test("resolveClerkDoor matches active allow-listed members, rejects inactive/unlisted, and bootstraps OPS_ADMIN_EMAILS", () => {
  const members = [
    { id: "m1", email: "ops@career141.com", active: true },
    { id: "m2", email: "left@career141.com", active: false },
  ];
  const admins = adminEmailsFrom({ OPS_ADMIN_EMAILS: "dev@career141.com, boss@career141.com" });

  assert.deepEqual(resolveClerkDoor("OPS@career141.com", members, admins), { ok: true, memberId: "m1" });
  const inactive = resolveClerkDoor("left@career141.com", members, admins);
  assert.equal(inactive.ok, false);
  if (!inactive.ok) assert.match(inactive.why, /inactive/i);

  assert.deepEqual(resolveClerkDoor("dev@career141.com", members, admins), {
    ok: true,
    provisionAdmin: true,
    email: "dev@career141.com",
  });

  const stranger = resolveClerkDoor("stranger@example.com", members, admins);
  assert.equal(stranger.ok, false);
  if (!stranger.ok) assert.match(stranger.why, /not on the Ops team/i);
});

test("3-tier access model: Ops person, Ops lead, and Admin capabilities & View-as", () => {
  assert.deepEqual(ASSIGNABLE_ROLES, ["ops_owner", "ops_lead", "admin"]);
  assert.equal(ROLE_LABEL.ops_owner, "Ops person");
  assert.equal(ROLE_LABEL.ops_lead, "Ops lead");
  assert.equal(ROLE_LABEL.admin, "Admin");

  // Admin has full access including refunds, settings, money, whole desk, and View-as
  const admin = { role: "admin" as const, active: true };
  assert.equal(can(admin, "refund.decide"), true);
  assert.equal(can(admin, "settings.manage"), true);
  assert.equal(can(admin, "money.manage"), true);
  assert.equal(can(admin, "task.reassign"), true);
  assert.equal(seesWholeDesk(admin), true);
  assert.equal(canPreview("admin", "ops_lead"), true);
  assert.equal(canPreview("admin", "ops_owner"), true);

  // Ops lead can manage settings/money/reassign and preview Ops person, but not Admin or refund.decide
  const lead = { role: "ops_lead" as const, active: true };
  assert.equal(can(lead, "settings.manage"), true);
  assert.equal(can(lead, "money.manage"), true);
  assert.equal(can(lead, "refund.decide"), false);
  assert.equal(canPreview("ops_lead", "ops_owner"), true);
  assert.equal(canPreview("ops_lead", "admin"), false);

  // Ops person cannot manage settings/money/refunds/reassign or preview higher roles
  const person = { role: "ops_owner" as const, active: true };
  assert.equal(can(person, "client.manage"), true);
  assert.equal(can(person, "settings.manage"), false);
  assert.equal(can(person, "money.manage"), false);
  assert.equal(canPreview("ops_owner", "ops_lead"), false);
  assert.equal(canPreview("ops_owner", "admin"), false);
});
