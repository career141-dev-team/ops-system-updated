/**
 * Meetings. Three things from the owner's board are being fixed here:
 * meetings that are not held and nobody chases, people forgetting a meeting is
 * on, and what was said staying in somebody's head.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { DAY, HOUR, colomboDate, colomboHour } from "@/lib/calendar";
import {
  MAX_REBOOKS,
  afterNotHeld,
  agreementDueAt,
  missingFromHeld,
  problemWithBooking,
  problemWithHeld,
  remindersFor,
  warningAboutBooking,
} from "@/lib/meetings";

// A Monday, 10:00 Colombo.
const MONDAY_10 = Date.UTC(2026, 10, 2, 4, 30);
const NOW = MONDAY_10 - 3 * DAY;

test("a booking in the past or the middle of the night is refused", () => {
  const good = { at: MONDAY_10, taLeadId: "ta_u1" };
  assert.equal(problemWithBooking(good, NOW), null);
  assert.match(problemWithBooking({ ...good, at: NOW - HOUR }, NOW) ?? "", /already passed/);
  assert.match(problemWithBooking({ ...good, at: 0 }, NOW) ?? "", /when the meeting is/);
  assert.match(problemWithBooking({ ...good, at: NOW + 400 * DAY }, NOW) ?? "", /more than a year/);
  // 03:00 Colombo
  assert.match(problemWithBooking({ ...good, at: Date.UTC(2026, 10, 2, 21, 30) }, NOW) ?? "", /middle of the night/);
  assert.match(problemWithBooking({ ...good, taLeadId: "" }, NOW) ?? "", /which TA lead/);
});

test("an odd but allowed time is warned about, not refused", () => {
  // A Sunday.
  const sunday = Date.UTC(2026, 10, 1, 4, 30);
  assert.match(warningAboutBooking(sunday) ?? "", /not a working day/);
  // 07:00 Colombo on the Monday: early, allowed, worth checking.
  assert.match(warningAboutBooking(Date.UTC(2026, 10, 2, 1, 30)) ?? "", /outside 08:00 to 20:00/);
  assert.equal(warningAboutBooking(MONDAY_10), null);
  assert.match(warningAboutBooking(MONDAY_10, [colomboDate(MONDAY_10)]) ?? "", /not a working day/);
});

test("two reminders: the day before at nine, and an hour before", () => {
  const reminders = remindersFor(MONDAY_10, NOW);
  assert.deepEqual(reminders.map((r) => r.kind), ["meeting.reminder.day", "meeting.reminder.hour"]);
  assert.equal(colomboHour(reminders[0].dueAt), 9);
  assert.equal(colomboDate(reminders[0].dueAt), "2026-11-01", "the day before the meeting");
  assert.equal(reminders[1].dueAt, MONDAY_10 - HOUR);
});

test("a meeting later today gets only the hour-before reminder", () => {
  const soon = MONDAY_10;
  const reminders = remindersFor(soon, soon - 4 * HOUR);
  assert.deepEqual(reminders.map((r) => r.kind), ["meeting.reminder.hour"]);
});

test("a meeting in twenty minutes gets no reminder at all", () => {
  assert.deepEqual(remindersFor(MONDAY_10, MONDAY_10 - 20 * 60_000), []);
});

test("rebooking continues while the client answers, and stops after three", () => {
  assert.equal(afterNotHeld(0, true).action, "rebook");
  assert.equal(afterNotHeld(5, true).action, "rebook", "a client who answers is never closed on");

  assert.equal(afterNotHeld(0, false).action, "rebook");
  assert.equal(afterNotHeld(1, false).action, "rebook");
  const third = afterNotHeld(2, false);
  assert.equal(third.action, "close");
  assert.equal(third.rebookCount, MAX_REBOOKS);
  assert.match(third.because, /no reply/);
});

test("a meeting cannot be marked held with nothing written down", () => {
  assert.match(problemWithHeld({ brief: "", role: "CFO", packageSaid: "1m" }) ?? "", /only record of it/);
  assert.match(problemWithHeld({ brief: "went well", role: "", packageSaid: "" }) ?? "", /only record of it/);
  assert.equal(
    problemWithHeld({ brief: "They want a head of finance, starting in January.", role: "", packageSaid: "" }),
    null,
  );
});

test("the role and the package are asked for, and what is missing is said", () => {
  assert.deepEqual(missingFromHeld({ brief: "x", role: "", packageSaid: "" }), [
    "the position",
    "the package they have in mind",
  ]);
  assert.deepEqual(missingFromHeld({ brief: "x", role: "CFO", packageSaid: "" }), ["the package they have in mind"]);
  assert.deepEqual(missingFromHeld({ brief: "x", role: "CFO", packageSaid: "1.2m" }), []);
});

test("the agreement is due two hours after the call", () => {
  assert.equal(agreementDueAt(MONDAY_10, 2), MONDAY_10 + 2 * HOUR);
});

test("the week ahead keeps a meeting whose time has passed", async () => {
  // The one somebody has to chase is exactly the meeting that went by with
  // nobody marking it held, so it stays in the list (step 20).
  const { meetingsAhead } = await import("@/lib/meetings");
  const now = Date.UTC(2026, 10, 3, 4, 0);
  const rows = [
    { id: "m1", at: now + 2 * DAY, state: "booked" },
    { id: "m2", at: now - 1 * DAY, state: "booked" },
    { id: "m3", at: now + 20 * DAY, state: "booked" },
    { id: "m4", at: now + 1 * DAY, state: "held" },
    { id: "m5", at: now + 1 * DAY, state: "cancelled" },
  ];
  assert.deepEqual(
    meetingsAhead(rows, now).map((m) => m.id),
    ["m2", "m1"],
    "soonest first, the one already gone at the top, and nothing settled",
  );
  assert.deepEqual(
    meetingsAhead(rows, now, 30).map((m) => m.id),
    ["m2", "m1", "m3"],
  );
});

test("when a meeting is says itself in plain words", async () => {
  const { whenInWords } = await import("@/lib/meetings");
  // 09:30 Colombo is 04:00 UTC.
  const today = Date.UTC(2026, 10, 3, 4, 0);
  assert.match(whenInWords(today, today), /^Today at 09:30$/);
  assert.match(whenInWords(today + 86_400_000, today), /^Tomorrow at 09:30$/);
  assert.match(whenInWords(today - 86_400_000, today), /^Yesterday at 09:30 — was it held\?$/);
  assert.match(whenInWords(today - 3 * 86_400_000, today), /^3 days ago at 09:30 — was it held\?$/);
  assert.match(whenInWords(today + 5 * 86_400_000, today), /^2026-11-08 at 09:30$/);
});
