/** An empty backend gets the sample desk only when the run asks for it (22 Nov). */
import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "@/data/seed";
import { firstRunDesk, wantsSampleDesk } from "@/lib/firstRun";

test("only OPS_SAMPLE_DESK=on asks for the sample desk", () => {
  assert.equal(wantsSampleDesk({ OPS_SAMPLE_DESK: "on" }), true);
  assert.equal(wantsSampleDesk({}), false);
  assert.equal(wantsSampleDesk({ OPS_SAMPLE_DESK: "" }), false);
  assert.equal(wantsSampleDesk({ OPS_SAMPLE_DESK: "true" }), false);
  assert.equal(wantsSampleDesk({ OPS_SAMPLE_DESK: "off" }), false);
});

test("without the flag an empty backend gets the real defaults and nothing invented", () => {
  const sample = seed();
  const desk = firstRunDesk(sample, false);
  assert.deepEqual(desk.members, []);
  assert.deepEqual(desk.timers, []);
  assert.deepEqual(desk.tasks, []);
  assert.deepEqual(desk.messages, []);
  assert.deepEqual(desk.holidays, []);
  assert.ok(desk.settings.length > 0, "the rules need their numbers");
  assert.deepEqual(desk.settings, sample.settings);
  assert.deepEqual(desk.templates, sample.templates);
  // Outreach stays off on a fresh live desk.
  assert.equal(desk.settings.find((s) => s.key === "switch.outreachLive")?.value, false);
  // No sample address or name slips into what a live desk is given.
  assert.doesNotMatch(JSON.stringify(desk), /example\.test|Sample /);
});

test("with the flag the sample desk goes in whole, as before", () => {
  const sample = seed();
  assert.equal(firstRunDesk(sample, true), sample);
});
