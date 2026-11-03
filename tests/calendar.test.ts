/**
 * Working days, calendar days and Colombo time.
 *
 * These decide where every deadline in Ops lands, and the three ways of
 * counting are not interchangeable: the seven-day CV ownership window is
 * working days, the ninety-day guarantee is calendar days, and the agreement
 * clock is hours. A mistake here puts a deadline on a Sunday.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  addCalendarDays,
  addWorkingDays,
  colomboDate,
  colomboHour,
  DAY,
  inWorkingHours,
  isWorkingDay,
  nextNineAm,
  workingDaysBetween,
} from "@/lib/calendar";

/** Monday 2 November 2026, 10:00 Colombo. */
const MON_10AM = Date.UTC(2026, 10, 2, 4, 30);
const SAT = Date.UTC(2026, 10, 7, 4, 30);
const SUN = Date.UTC(2026, 10, 8, 4, 30);

test("Colombo is five and a half hours ahead, and the date follows it", () => {
  assert.equal(colomboDate(MON_10AM), "2026-11-02");
  assert.equal(colomboHour(MON_10AM), 10);
  // 23:00 UTC on the 2nd is already the 3rd in Colombo.
  assert.equal(colomboDate(Date.UTC(2026, 10, 2, 23, 0)), "2026-11-03");
});

test("weekends are not working days, and neither is a holiday", () => {
  assert.equal(isWorkingDay(MON_10AM), true);
  assert.equal(isWorkingDay(SAT), false);
  assert.equal(isWorkingDay(SUN), false);
  assert.equal(isWorkingDay(MON_10AM, ["2026-11-02"]), false);
});

test("seven working days from a Monday lands on the following Wednesday", () => {
  const due = addWorkingDays(MON_10AM, 7);
  assert.equal(colomboDate(due), "2026-11-11");
  assert.equal(isWorkingDay(due), true);
});

test("a holiday inside the window pushes the deadline out by a day", () => {
  const plain = addWorkingDays(MON_10AM, 7);
  const withHoliday = addWorkingDays(MON_10AM, 7, ["2026-11-04"]);
  assert.equal(colomboDate(withHoliday), "2026-11-12");
  assert.equal(withHoliday - plain, DAY);
});

test("zero working days is now, even on a Sunday, because now is not a deadline", () => {
  assert.equal(addWorkingDays(SUN, 0), SUN);
  assert.equal(addWorkingDays(MON_10AM, -3), MON_10AM);
});

test("calendar days ignore weekends, which is why the guarantee uses them", () => {
  const ninety = addCalendarDays(MON_10AM, 90);
  assert.equal(colomboDate(ninety), "2027-01-31");
});

test("counting working days between two instants skips the weekend", () => {
  assert.equal(workingDaysBetween(MON_10AM, addCalendarDays(MON_10AM, 7)), 5);
  assert.equal(workingDaysBetween(MON_10AM, MON_10AM), 0);
  assert.equal(workingDaysBetween(addCalendarDays(MON_10AM, 7), MON_10AM), 0, "backwards is zero, not negative");
});

test("the next nine in the morning is tomorrow once today's has passed", () => {
  assert.equal(colomboDate(nextNineAm(MON_10AM)), "2026-11-03");
  assert.equal(colomboHour(nextNineAm(MON_10AM)), 9);
  const earlyMonday = Date.UTC(2026, 10, 2, 1, 0);
  assert.equal(colomboDate(nextNineAm(earlyMonday)), "2026-11-02");
});

test("working hours are eight in the morning to eight at night, Colombo", () => {
  assert.equal(inWorkingHours(MON_10AM), true);
  assert.equal(inWorkingHours(Date.UTC(2026, 10, 2, 17, 30)), false);
});

test("an agreement's date reads as a date, not as a number", async () => {
  const { colomboDateInWords } = await import("@/lib/calendar");
  // The filled template said "made on this day of 2026-11-03" on its first
  // run, which is how you can tell a machine wrote it (3 Nov).
  assert.equal(colomboDateInWords(Date.UTC(2026, 10, 3, 4, 0)), "3 November 2026");
  // 23:00 UTC is already the next day in Colombo.
  assert.equal(colomboDateInWords(Date.UTC(2026, 10, 3, 23, 0)), "4 November 2026");
  assert.equal(colomboDateInWords(Date.UTC(2027, 0, 1, 6, 0)), "1 January 2027");
});
