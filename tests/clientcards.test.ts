import assert from "node:assert/strict";
import test from "node:test";

import { agoShort, agreementEyebrow, dotTone, sourceShort } from "@/lib/clientCards";

const H = 3_600_000;
const NOW = Date.UTC(2026, 10, 16, 10, 0); // Monday 16 Nov, 15:30 in Colombo

test("how long ago, as short as it can be said", () => {
  assert.equal(agoShort(NOW - 10 * 60_000, NOW), "Just now");
  assert.equal(agoShort(NOW - 2 * H, NOW), "2h ago");
  assert.equal(agoShort(NOW - 8 * H, NOW), "Today");
  assert.equal(agoShort(NOW - 24 * H, NOW), "Yesterday");
  assert.equal(agoShort(NOW - 3 * 24 * H, NOW), "Fri");
  assert.equal(agoShort(NOW - 20 * 24 * H, NOW), "27 Oct");
});

test("words for the source, the agreement and the dot", () => {
  assert.equal(sourceShort("website"), "Website form");
  assert.equal(sourceShort("odd"), "odd");
  assert.equal(agreementEyebrow("negotiating"), "Wants changes");
  assert.equal(dotTone({ late: true, booked: true, ours: true }), "danger", "late beats everything");
  assert.equal(dotTone({ late: false, booked: true, ours: false }), "info");
  assert.equal(dotTone({ late: false, booked: false, ours: false }), "quiet");
});
