/**
 * The clocks run by themselves everywhere (11 Nov). The owner asked whether
 * we had a clock feature at all: on the laptop and the Railway preview the
 * clocks ran only when somebody opened a page or pressed the button.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { SELF_CLOCK_EVERY_MS, selfClockWanted, testToolsShown } from "@/lib/clockPass";

test("the app times its own clocks on the JSON store, and leaves Convex to its cron", () => {
  assert.equal(selfClockWanted({}), true, "no store named means JSON");
  assert.equal(selfClockWanted({ OPS_STORE: "json" }), true);
  assert.equal(selfClockWanted({ OPS_STORE: "convex" }), false, "the backend's cron asks /api/clock there");
  assert.equal(selfClockWanted({ OPS_STORE: "json", OPS_SELF_CLOCK: "off" }), false);
  assert.equal(SELF_CLOCK_EVERY_MS, 5 * 60_000, "the same five minutes as the server's cron");
});

test("the clock buttons are test tools, hidden unless switched on", () => {
  assert.equal(testToolsShown({}), false);
  assert.equal(testToolsShown({ OPS_TEST_TOOLS: "off" }), false);
  assert.equal(testToolsShown({ OPS_TEST_TOOLS: "on" }), true);
});
