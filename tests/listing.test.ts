/**
 * Searching and sorting a list (25, section 7).
 *
 * A table is only worth having if the search finds what a person meant and
 * the order is the one they asked for. Both are rules, so both are tested
 * here rather than looked at on a screen.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { SORTS, day, foundInWords, listed, matches, sortKeyFrom, sortRows, type Listed } from "@/lib/listing";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 9, 4, 30);

const row = (over: Partial<Listed> = {}): Listed => ({
  id: "a",
  href: "/positions/a",
  title: "NIPPON PAINT · Head of finance",
  words: ["Rushda", "ta_j1"],
  says: "Waiting on them: 5 of 5 candidates have no answer yet.",
  at: NOW - DAY,
  late: false,
  chips: [],
  who: "Rushda",
  ...over,
});

test("a search finds what a person meant, and nothing clever", () => {
  assert.equal(matches(row(), ""), true, "no search shows everything");
  assert.equal(matches(row(), "nippon"), true, "case does not count");
  assert.equal(matches(row(), "  HEAD of  "), true, "nor does spacing");
  assert.equal(matches(row(), "rushda"), true, "the owner is searchable");
  assert.equal(matches(row(), "ta_j1"), true, "and so is the opening id");
  assert.equal(matches(row(), "candidates"), true, "the one-line summary counts too");

  // Every word has to appear: "nippon finance" is the finance role at Nippon,
  // not everything at Nippon and everything in finance.
  assert.equal(matches(row(), "nippon finance"), true);
  assert.equal(matches(row(), "nippon marketing"), false);
  assert.equal(matches(row(), "hemas"), false);
});

test("the order is the one they asked for, and late is the default", () => {
  assert.equal(sortKeyFrom(undefined), "late");
  assert.equal(sortKeyFrom("nonsense"), "late", "an unknown order is the default, never a blank table");
  assert.equal(sortKeyFrom("name"), "name");
  assert.deepEqual(SORTS.map((sort) => sort.key), ["late", "newest", "oldest", "name"]);

  const rows = [
    row({ id: "fresh", title: "B", at: NOW - DAY }),
    row({ id: "old", title: "C", at: NOW - 30 * DAY }),
    row({ id: "late", title: "A", at: NOW - 2 * DAY, late: true }),
  ];

  assert.deepEqual(
    sortRows(rows, "late").map((one) => one.id),
    ["late", "old", "fresh"],
    "late first, then whatever has waited longest",
  );
  assert.deepEqual(sortRows(rows, "newest").map((one) => one.id), ["fresh", "late", "old"]);
  assert.deepEqual(sortRows(rows, "oldest").map((one) => one.id), ["old", "late", "fresh"]);
  assert.deepEqual(sortRows(rows, "name").map((one) => one.id), ["late", "fresh", "old"]);
});

test("the two together, as a page uses them", () => {
  const rows = [row({ id: "a", title: "NIPPON · Head of finance" }), row({ id: "b", title: "HEMAS · Brand manager" })];
  assert.deepEqual(listed(rows, "hemas", "name").map((one) => one.id), ["b"]);
  assert.deepEqual(listed(rows, "", "name").map((one) => one.id), ["b", "a"]);
});

test("an empty table says why it is empty", () => {
  assert.equal(foundInWords(3, 3, ""), "3 rows");
  assert.equal(foundInWords(1, 1, ""), "1 row");
  assert.equal(foundInWords(2, 9, "nippon"), "2 of 9 match “nippon”");
  assert.match(foundInWords(0, 9, "zzz"), /Nothing matches .zzz./);
  assert.match(foundInWords(0, 9, "zzz"), /looks at the name, the one-line summary, the client and the owner/);
});

test("a date in a column is Colombo's own day", () => {
  assert.equal(day(null), "—");
  // 4 November 2026 at 22:00 UTC is already the 5th in Colombo.
  assert.equal(day(Date.UTC(2026, 10, 4, 22, 0)), "2026-11-05");
});
