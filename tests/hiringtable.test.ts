/**
 * Internal hiring across vacancies (23 Nov): the board's columns, the table's filters and its paging.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { applicantRows, boardColumns, filterApplicants, pageOf } from "@/lib/hiringTable";
import type { Applicant, HiringView, Vacancy } from "@/lib/hiring";

const person = (id: string, stage: Applicant["stage"], since: number, extra: Partial<Applicant> = {}): Applicant => ({ id, name: "Person " + id, source: "Scoop", phone: "077" + id, stage, since, detail: "", ...extra });
const vac = (id: string, title: string, applicants: Applicant[]): Vacancy => ({ id, title, places: 1, filled: 0, postedAt: 0, status: "open", applicants, checks: [] });

const view: HiringView = {
  vacancies: [
    vac("v1", "Recruiter", [person("1", "new", 5), person("2", "call", 3), person("3", "fits", 4), person("4", "rejected", 9, { cvFileId: "f1" })]),
    vac("v2", "Designer", [person("5", "call", 1), person("6", "interview", 2), person("7", "hired", 8)]),
  ],
  slots: [],
  hiredThisMonth: [],
};

test("everyone is a row, the longest-waiting first, with the vacancy's name", () => {
  const rows = applicantRows(view);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.id), ["5", "6", "2"]);
  assert.equal(rows.find((r) => r.id === "5")!.vacancy, "Designer");
  assert.equal(rows.find((r) => r.id === "4")!.hasCv, true);
  assert.equal(rows.find((r) => r.id === "1")!.hasCv, false);
});

test("the filters narrow by vacancy, stage and every word, and To call holds the new CVs", () => {
  const rows = applicantRows(view);
  assert.deepEqual(filterApplicants(rows, { vacancyId: "v2" }).map((r) => r.id).sort(), ["5", "6", "7"]);
  assert.deepEqual(filterApplicants(rows, { stage: "call" }).map((r) => r.id).sort(), ["1", "2", "5"]);
  assert.deepEqual(filterApplicants(rows, { q: "designer person 6" }).map((r) => r.id), ["6"]);
  assert.deepEqual(filterApplicants(rows, { q: "0775" }).map((r) => r.id), ["5"]);
  assert.equal(filterApplicants(rows, {}).length, 7);
});

test("the board shows a few cards a column and counts all of them", () => {
  const cols = boardColumns(applicantRows(view), 2);
  const to = cols.find((c) => c.stage === "call")!;
  assert.deepEqual([to.total, to.shown.length], [3, 2]);
  assert.deepEqual(cols.map((c) => c.stage), ["call", "fits", "interview", "decision", "hired", "rejected"]);
  assert.equal(cols.find((c) => c.stage === "decision")!.total, 0);
});

test("a long list is paged, and a page out of range lands on a real one", () => {
  const many = Array.from({ length: 120 }, (_, i) => i);
  assert.deepEqual([pageOf(many, 1).items.length, pageOf(many, 1).pages], [50, 3]);
  assert.equal(pageOf(many, 3).items.length, 20);
  assert.equal(pageOf(many, 99).page, 3);
  assert.equal(pageOf(many, -4).page, 1);
  assert.equal(pageOf([], 1).pages, 1);
});
