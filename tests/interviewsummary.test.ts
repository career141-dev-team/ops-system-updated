/**
 * The interview summary table (23 Nov): the team's four statuses, the mode, and the filters.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { filterSummary, statusOf, summaryRows } from "@/lib/interviewSummary";
import type { OpsDatabase } from "@/data/types";

// Wednesday 25 Nov 2026, 12:00 in Colombo.
const NOW = Date.UTC(2026, 10, 25, 6, 30);
const DAY = 86_400_000;

test("the team's statuses come from the interview's state, and a withdrawal is not a cancellation", () => {
  assert.equal(statusOf("slots"), "Pending");
  for (const s of ["agreed", "booked", "reconfirmed"]) assert.equal(statusOf(s), "Scheduled");
  assert.equal(statusOf("attended"), "Attended");
  assert.equal(statusOf("withdrew"), "Withdrew");
  assert.equal(statusOf("cancelled"), "Cancelled");
  assert.equal(statusOf("no_show"), "No-show");
});

const db = {
  clients: [{ id: "c1", name: "Acme Ltd" }, { id: "c2", name: "Zeta" }],
  positions: [{ id: "p1", openingTaId: "o1", clientId: "c1", title: "Head of sales" }],
  vacancies: [{ id: "v1", title: "Recruiter" }],
  interviews: [
    { id: "i1", candidateName: "Nimal", clientId: "c1", positionId: "p1", openingTaId: "o1", state: "booked", round: 2, format: "online", at: NOW + DAY },
    { id: "i2", candidateName: "Kamal", clientId: "c2", positionId: null, openingTaId: "o9", state: "withdrew", round: 1, format: "onsite", at: NOW - DAY },
    { id: "i3", candidateName: "Sunil", clientId: "c1", positionId: "p1", openingTaId: "o1", state: "slots", round: 1, format: "phone", at: null },
  ],
  applicants: [
    { id: "a1", name: "Ruwan", vacancyId: "v1", interviewAt: NOW + 2 * DAY, joinUrl: "https://teams.example/x", place: null },
    { id: "a2", name: "Dilani", vacancyId: "v1", interviewAt: null, joinUrl: null, place: null },
  ],
} as unknown as OpsDatabase;

test("client and internal interviews are rows with the team's words, and a row with no time comes first", () => {
  const rows = summaryRows(db, NOW);
  assert.equal(rows.length, 4, "an applicant with no interview time is not a row");
  assert.equal(rows[0].candidate, "Sunil", "no time yet needs somebody, so it leads");
  const nimal = rows.find((r) => r.candidate === "Nimal")!;
  assert.deepEqual([nimal.client, nimal.mode, nimal.status, nimal.detail], ["Acme Ltd", "Online", "Scheduled", "Head of sales · round 2"]);
  const kamal = rows.find((r) => r.candidate === "Kamal")!;
  assert.deepEqual([kamal.client, kamal.mode, kamal.status], ["Zeta", "On-site", "Withdrew"]);
  const ruwan = rows.find((r) => r.candidate === "Ruwan")!;
  assert.deepEqual([ruwan.kind, ruwan.mode, ruwan.status], ["internal", "Online", "Scheduled"]);
});

test("the filters narrow by client, mode, status and date", () => {
  const rows = summaryRows(db, NOW);
  assert.deepEqual(filterSummary(rows, { client: "acme" }).map((r) => r.candidate).sort(), ["Nimal", "Sunil"]);
  assert.deepEqual(filterSummary(rows, { mode: "On-site" }).map((r) => r.candidate), ["Kamal"]);
  assert.deepEqual(filterSummary(rows, { status: "Pending" }).map((r) => r.candidate), ["Sunil"]);
  // 26 Nov only: Nimal. Sunil has no time, so a date range leaves him out.
  assert.deepEqual(filterSummary(rows, { from: "2026-11-26", to: "2026-11-26" }).map((r) => r.candidate), ["Nimal"]);
  assert.equal(filterSummary(rows, {}).length, 4);
});
