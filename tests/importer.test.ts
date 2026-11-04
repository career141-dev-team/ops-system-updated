/**
 * The first-day import (15, Phase 8 step 11).
 *
 * These rows become the client list, the roles and the holiday list that
 * every clock counts from, so a wrong one is worse than a missing one: a bad
 * row stops itself and says which line it was on.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  IMPORT_KINDS,
  keyOf,
  missingColumns,
  planImport,
  planInWords,
  problemWithImport,
  problemWithRow,
  readSheet,
} from "@/lib/importer";

test("a sheet reads whether it was saved with commas or copied with tabs", () => {
  const commas = readSheet("company,taClientId,ownerEmail\nSAMPLE CLIENT,ta_c1,owner@example.test");
  assert.deepEqual(commas.header, ["company", "taclientid", "owneremail"]);
  assert.equal(commas.rows.length, 1);
  assert.equal(commas.rows[0].values.company, "SAMPLE CLIENT");
  assert.equal(commas.rows[0].line, 2, "the header is line one, as a person counts");

  const tabs = readSheet("company\ttaClientId\townerEmail\nSAMPLE CLIENT\tta_c1\towner@example.test");
  assert.deepEqual(tabs.rows[0].values, commas.rows[0].values);

  // A comma inside a quoted name is part of the name.
  const quoted = readSheet('company,taClientId,ownerEmail\n"SAMPLE CLIENT, PVT",ta_c1,owner@example.test');
  assert.equal(quoted.rows[0].values.company, "SAMPLE CLIENT, PVT");

  // Blank lines and a trailing newline are not rows.
  assert.equal(readSheet("date,name\n2026-11-24,Poya\n\n").rows.length, 1);
  assert.deepEqual(readSheet("").rows, []);
});

test("a file without the columns it needs is refused, not guessed at", () => {
  assert.deepEqual(missingColumns("clients", ["company", "taclientid", "owneremail"]), []);
  assert.deepEqual(missingColumns("clients", ["company", "owneremail"]), ["taclientid"]);
  assert.deepEqual(missingColumns("holidays", ["date"]), ["name"]);

  const plan = planImport("clients", "company,ownerEmail\nSAMPLE,owner@example.test", []);
  assert.equal(plan.toAdd.length, 0);
  assert.match(plan.problems[0].what, /no taclientid column/i);
});

test("every kind of bad row says what is wrong with it", () => {
  const row = (values: Record<string, string>) => ({ line: 2, values });
  assert.equal(problemWithRow("clients", row({ company: "A", taclientid: "ta_c1", owneremail: "a@b.test" })), null);
  assert.match(problemWithRow("clients", row({ taclientid: "ta_c1", owneremail: "a@b.test" })) ?? "", /company name/i);
  assert.match(problemWithRow("clients", row({ company: "A", owneremail: "a@b.test" })) ?? "", /TA client id/);
  assert.match(problemWithRow("clients", row({ company: "A", taclientid: "t", owneremail: "nobody" })) ?? "", /owner/i);

  assert.equal(problemWithRow("holidays", row({ date: "2026-11-24", name: "Poya" })), null);
  assert.match(problemWithRow("holidays", row({ date: "24/11/2026", name: "Poya" })) ?? "", /2026-11-24 shaped/);

  assert.equal(problemWithRow("members", row({ name: "A", email: "a@b.test", role: "ops_owner" })), null);
  assert.match(problemWithRow("members", row({ name: "A", email: "a@b.test", role: "boss" })) ?? "", /role has to be/);
});

test("a file run twice adds nothing, and a bad row does not stop the rest", () => {
  const sheet = [
    "date,name",
    "2026-11-24,Poya",
    "24/11/2026,Wrong shape",
    "2026-12-25,Christmas Day",
    "2026-11-24,Poya again",
  ].join("\n");

  const first = planImport("holidays", sheet, []);
  assert.equal(first.toAdd.length, 2, "the two good ones");
  assert.equal(first.problems.length, 1);
  assert.equal(first.problems[0].line, 3, "and the line it was on");
  assert.equal(first.already.length, 1, "the repeat inside the same file counts as already here");
  assert.match(planInWords(first), /2 rows to add/);
  assert.match(planInWords(first), /cannot be read/);

  // Run again once those two are in: nothing to add.
  const second = planImport("holidays", sheet, ["2026-11-24", "2026-12-25"]);
  assert.equal(second.toAdd.length, 0);
  assert.equal(second.already.length, 3);
});

test("nothing is written on a file nobody has looked at", () => {
  const plan = planImport("holidays", "date,name\n2026-11-24,Poya", []);
  assert.match(problemWithImport(plan, false) ?? "", /dry run first/i);
  assert.equal(problemWithImport(plan, true), null);

  const rubbish = planImport("holidays", "date,name\n24/11/2026,Wrong", []);
  assert.match(problemWithImport(rubbish, true) ?? "", /Every row has something wrong/);

  const empty = planImport("holidays", "date,name", []);
  assert.match(problemWithImport(empty, true) ?? "", /Nothing in this file/);
});

test("each kind is recognised by its own key", () => {
  assert.equal(keyOf("clients", { line: 2, values: { taclientid: "TA_C1" } }), "ta_c1");
  assert.equal(keyOf("holidays", { line: 2, values: { date: "2026-11-24" } }), "2026-11-24");
  assert.equal(keyOf("members", { line: 2, values: { email: "A@B.test" } }), "a@b.test");
  // Every kind says what it is for, so the screen needs no wording of its own.
  for (const kind of Object.keys(IMPORT_KINDS)) {
    assert(IMPORT_KINDS[kind as keyof typeof IMPORT_KINDS].what.length > 10, kind + " has no explanation");
  }
});
