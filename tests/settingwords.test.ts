import assert from "node:assert/strict";
import test from "node:test";

import { isInternal, settingWords } from "@/lib/settingWords";

test("a setting reads the way the frame writes it", () => {
  assert.equal(settingWords("esa.declineDays", 14).shown, "14 days");
  assert.equal(settingWords("feedback.chaseDays", 1).shown, "After 1 working day");
  assert.equal(settingWords("invoice.latePctPerMonth", 5).shown, "5% a month");
  assert.equal(settingWords("guarantee.days", 90).label, "Guarantee");
});

test("an unworded setting falls back to its key; machine state is not shown", () => {
  assert.equal(settingWords("brand.new", 3).label, "brand.new");
  assert.equal(settingWords("brand.new", 3).shown, "3");
  assert.equal(isInternal("clock.lastPass"), true);
  assert.equal(isInternal("ta.eventsCursor"), true);
  assert.equal(isInternal("guarantee.days"), false);
});
