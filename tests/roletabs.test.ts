import assert from "node:assert/strict";
import test from "node:test";

import { ROLE_TABS, resolveRoleTab } from "@/lib/roleTabs";

test("every new key resolves to itself", () => {
  for (const key of ROLE_TABS) assert.equal(resolveRoleTab(key), key);
});

test("old keys land on the new tabs", () => {
  assert.equal(resolveRoleTab("jd"), "requirement");
  assert.equal(resolveRoleTab("advertising"), "requirement");
  assert.equal(resolveRoleTab("placements"), "offer");
  assert.equal(resolveRoleTab("activity"), "history");
  assert.equal(resolveRoleTab("candidates"), "sets");
});

test("old ?tab= still works and nothing known falls back to the overview", () => {
  assert.equal(resolveRoleTab(undefined, "adverts"), "requirement");
  assert.equal(resolveRoleTab(undefined, "sets"), "sets");
  assert.equal(resolveRoleTab(undefined, "messages"), "history");
  assert.equal(resolveRoleTab("nonsense"), "overview");
  assert.equal(resolveRoleTab(), "overview");
});
