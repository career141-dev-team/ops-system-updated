/**
 * The holiday list. Until it is filled, every working-day clock in Ops counts
 * a poya day as a working day, so the parsing has to be forgiving about how
 * the list was pasted and strict about what is a date.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { fromTodayOn, gapInTheList, holidayYears, isRealDate, parseHolidayLines } from "@/lib/holidays";

test("a date must be a real day", () => {
  assert.equal(isRealDate("2027-01-15"), true);
  assert.equal(isRealDate("2027-02-30"), false);
  assert.equal(isRealDate("2027-13-01"), false);
  assert.equal(isRealDate("15/01/2027"), false);
  assert.equal(isRealDate(""), false);
});

test("a pasted list is read however it was separated", () => {
  const { days, problems } = parseHolidayLines(
    [
      "# Sri Lanka 2027",
      "2027-01-15, Thai Pongal",
      "2027-01-22\tDuruthu Full Moon Poya",
      "2027-02-04   Independence Day",
      "2027-02-19",
      "",
      "sometime in March",
    ].join("\n"),
  );
  assert.deepEqual(days, [
    { date: "2027-01-15", name: "Thai Pongal" },
    { date: "2027-01-22", name: "Duruthu Full Moon Poya" },
    { date: "2027-02-04", name: "Independence Day" },
    { date: "2027-02-19", name: "" },
  ]);
  assert.deepEqual(problems, ["sometime in March"], "a line we cannot read is said back, not dropped silently");
});

test("the same date twice is kept once", () => {
  const { days } = parseHolidayLines("2027-05-01, May Day\n2027-05-01, May Day again");
  assert.equal(days.length, 1);
});

test("past holidays are left out, and the years are listed", () => {
  const days = [
    { date: "2026-01-01", name: "old" },
    { date: "2026-12-25", name: "Christmas" },
    { date: "2027-01-15", name: "Thai Pongal" },
  ];
  assert.deepEqual(fromTodayOn(days, "2026-11-02").map((d) => d.date), ["2026-12-25", "2027-01-15"]);
  assert.deepEqual(holidayYears(days), ["2026", "2027"]);
});

test("a half-finished list says so, because a wrong clock is invisible", () => {
  assert.match(gapInTheList([], "2026-11-02") ?? "", /empty/);
  assert.match(gapInTheList([{ date: "2026-12-25", name: "x" }], "2026-11-02") ?? "", /Nothing is listed for 2027/);
  const few = [
    { date: "2026-12-25", name: "x" },
    { date: "2027-01-15", name: "y" },
  ];
  assert.match(gapInTheList(few, "2026-11-02") ?? "", /only 2 days listed/);
  const many = Array.from({ length: 25 }, (_, i) => ({ date: "2027-01-" + String(i + 1).padStart(2, "0"), name: "d" }));
  assert.equal(gapInTheList(many, "2026-11-02"), null);
});
