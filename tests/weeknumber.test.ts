import assert from "node:assert/strict";
import test from "node:test";

import { colomboIsoWeek } from "@/lib/weekNumber";

test("Sat 21 Nov 2026 is ISO week 47, in Colombo time", () => {
  assert.equal(colomboIsoWeek(Date.UTC(2026, 10, 21, 8, 0)), 47);
  assert.equal(colomboIsoWeek(Date.UTC(2026, 10, 22, 19, 0)), 48); // Mon 23 Nov 00:30 Colombo
  assert.equal(colomboIsoWeek(Date.UTC(2026, 0, 1, 5, 0)), 1);
  assert.equal(colomboIsoWeek(Date.UTC(2027, 0, 1, 5, 0)), 53);
});
