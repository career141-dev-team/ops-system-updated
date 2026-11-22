import assert from "node:assert/strict";
import test from "node:test";

import { meetingWeek } from "@/lib/calendarBoard";

const SAT_21_NOV = Date.UTC(2026, 10, 21, 8, 0);

test("the calendar week a booked meeting falls in", () => {
  assert.deepEqual(meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 20, 4, 0)), { offset: 0, sunday: false, mondayLabel: "16 Nov" });
  assert.equal(meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 24, 4, 0)).offset, 1);
  assert.equal(meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 24, 4, 0)).mondayLabel, "23 Nov");
  assert.equal(meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 10, 4, 0)).offset, -1);
  // Sun 22 Nov 10:00 Colombo: no calendar week shows it.
  assert.equal(meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 22, 4, 30)).sunday, true);
  // Mon 23 Nov 00:30 Colombo is still Sunday 22 in UTC, and Monday here.
  const early = meetingWeek(SAT_21_NOV, Date.UTC(2026, 10, 22, 19, 0));
  assert.equal(early.sunday, false);
  assert.equal(early.offset, 1);
});
