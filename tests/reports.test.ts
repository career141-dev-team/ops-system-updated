/**
 * The weekly report (15, Phase 3 step 18 and Phase 7 step 9).
 *
 * The report is read by a Director who was not in any of the conversations,
 * so these tests are mostly about honesty: the week it belongs to, what it
 * says when the TA System cannot be read, and that nothing reaches the
 * Director without a person approving it first.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  type ReportRow,
  REPORT_MEANINGS,
  STAGE_FOR_REPORT,
  daysBetween,
  nextMondayEightAm,
  problemWithReport,
  recipientsFrom,
  reportInWords,
  reportText,
  reportWeekOf,
  rowInWords,
} from "@/lib/reports";

const DAY = 86_400_000;
// Tuesday 3 November 2026, 09:30 Colombo.
const TUESDAY = Date.UTC(2026, 10, 3, 4, 0);

const line = (over: Partial<ReportRow> = {}): ReportRow => ({
  positionId: "pos_1",
  openingTaId: "ta_j1",
  client: "SAMPLE CLIENT",
  title: "Head of finance",
  primaryTa: "SAMPLE TA",
  stage: "searching",
  daysOpen: 12,
  counts: { client_shortlist: 2, follow_up: 9 },
  shortlisted: 2,
  setsSent: 1,
  lastSentAt: TUESDAY - 5 * DAY,
  daysWaitingOnClient: 5,
  decisionsIn: 0,
  onHold: false,
  depth: "follow_up",
  advertised: true,
  ...over,
});

test("a report belongs to its Monday, whatever day it is built on", () => {
  assert.equal(reportWeekOf(TUESDAY), "2026-11-02", "the Monday before the Tuesday");
  // The Friday of the same week, and the Sunday that ends it.
  assert.equal(reportWeekOf(TUESDAY + 3 * DAY), "2026-11-02");
  assert.equal(reportWeekOf(TUESDAY + 5 * DAY), "2026-11-02");
  // The Monday after is its own week.
  assert.equal(reportWeekOf(TUESDAY + 6 * DAY), "2026-11-09");
});

test("the next Monday at eight, Colombo, and never a Monday gone", () => {
  // Tuesday → the Monday after it, 08:00 Colombo = 02:30 UTC.
  assert.equal(nextMondayEightAm(TUESDAY), Date.UTC(2026, 10, 9, 2, 30));
  // Monday at 07:00 Colombo → eight the same morning.
  const earlyMonday = Date.UTC(2026, 10, 9, 1, 30);
  assert.equal(nextMondayEightAm(earlyMonday), Date.UTC(2026, 10, 9, 2, 30));
  // Monday at nine → the Monday after.
  const lateMonday = Date.UTC(2026, 10, 9, 3, 30);
  assert.equal(nextMondayEightAm(lateMonday), Date.UTC(2026, 10, 16, 2, 30));
});

test("an empty report is not sent, and one nobody could read says so", () => {
  assert.equal(problemWithReport([line()]), null);
  assert.match(problemWithReport([]) ?? "", /nothing to report/i);

  const blind = problemWithReport([line({ counts: null }), line({ positionId: "pos_2", counts: null })]) ?? "";
  assert.match(blind, /could not be read/i);
  assert.match(blind, /2 positions/);

  // One readable line is enough: the report goes, and says what is missing.
  assert.equal(problemWithReport([line(), line({ positionId: "pos_2", counts: null })]), null);
});

test("a line says what is true, and never a zero it does not know", () => {
  // The Director's words, not the ops screen's "Open in the TA System".
  assert.match(rowInWords(line()), /being searched/);
  assert.match(rowInWords(line()), /12 days open/);
  assert.match(rowInWords(line()), /2 shortlisted/);
  assert.match(rowInWords(line()), /5 days waiting on the client/);

  // Read nothing, say nothing: a zero here would read as "nobody shortlisted".
  const blind = rowInWords(line({ counts: null, shortlisted: null }));
  assert.match(blind, /could not be read/i);
  assert.doesNotMatch(blind, /0 shortlisted/);

  assert.match(rowInWords(line({ setsSent: 0, daysWaitingOnClient: null })), /no set yet/);
  assert.match(rowInWords(line({ decisionsIn: 3 })), /3 decisions back/);
  assert.match(rowInWords(line({ onHold: true })), /on hold/);
  assert.match(rowInWords(line({ advertised: false })), /no LinkedIn post/);
  assert.match(rowInWords(line({ daysOpen: 1 })), /1 day open/);
  assert.match(rowInWords(line({ daysOpen: 0 })), /handed over today/);
  assert.match(rowInWords(line({ daysWaitingOnClient: 0 })), /sent today, nothing back yet/);
  assert.match(rowInWords(line({ daysWaitingOnClient: 1 })), /1 day waiting on the client/);
  assert.match(rowInWords(line({ decisionsIn: 1 })), /1 decision back/);
  assert.match(rowInWords(line({ stage: "on_hold" })), /on hold/);
});

test("the report reads as sentences under each client, with what is waiting", () => {
  const text = reportText("2026-11-02", [
    line(),
    line({ positionId: "pos_2", title: "Storekeeper", setsSent: 0, daysWaitingOnClient: null }),
    line({ positionId: "pos_3", client: "ANOTHER CLIENT", decisionsIn: 2 }),
  ]);
  // Clients in order, each with its own positions under it.
  assert(text.indexOf("ANOTHER CLIENT") < text.indexOf("SAMPLE CLIENT"), "clients in order");
  assert.match(text, /Active positions, week of 2026-11-02/);
  assert.match(text, /Head of finance \(SAMPLE TA\)/);
  assert.match(text, /One client has a set and has not answered yet/);
  assert.match(text, /One position has had no set yet/);

  assert.match(reportInWords({ state: "review", weekOf: "2026-11-02", rows: [line()] }), new RegExp(REPORT_MEANINGS.review));
  assert.match(
    reportInWords({ state: "review", weekOf: "2026-11-02", rows: [line(), line({ counts: null })] }),
    /1 could not be read/,
  );
});

test("every stage a position can be in has a word for the Director", () => {
  for (const stage of ["handed_over", "queued", "searching", "on_hold", "closed"]) {
    assert(STAGE_FOR_REPORT[stage], stage + " has no wording");
  }
});

test("only real addresses are taken from the setting", () => {
  assert.deepEqual(recipientsFrom("director@example.test, ops@example.test"), [
    "director@example.test",
    "ops@example.test",
  ]);
  assert.deepEqual(recipientsFrom(" director@example.test "), ["director@example.test"]);
  assert.deepEqual(recipientsFrom("Mr Azeem"), [], "a name is not an address");
  assert.deepEqual(recipientsFrom(""), []);
  assert.deepEqual(recipientsFrom(null), []);
  assert.equal(daysBetween(TUESDAY, TUESDAY + 3 * DAY), 3);
  assert.equal(daysBetween(TUESDAY + DAY, TUESDAY), 0, "never negative");
});

test("Monday builds one report a week, leaves it to be read, and sets next Monday", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-report-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const client = repo.addClient({
    leadId: null,
    taClientId: "ta_c1",
    name: "SAMPLE CLIENT",
    nameKey: "sample client",
    stage: "active",
    billingName: "",
    billingEmail: "",
    groupName: "",
    notes: "",
    reason: null,
    ownerId: "m_owner",
  });
  const base = {
    requirementId: null,
    clientId: client.id,
    clientTaId: "ta_c1",
    title: "Head of finance",
    stage: "searching",
    primaryTaId: "ta_u2",
    hundredPercentDay: null,
    taStatus: "open",
    jdApprovedAt: null,
    linkedInUrl: null,
    linkedInPostedAt: null,
    depthStage: null,
    shortlistedTotal: null,
    pendingCount: null,
    depthCheckedAt: null,
    handedOverAt: now - 12 * DAY,
    closedAt: null,
    ownerId: "m_owner",
  };
  const open = repo.addPosition({ ...base, openingTaId: "ta_j1" });
  // Queued: TA has not confirmed it, so there is no pipeline to read.
  repo.addPosition({ ...base, openingTaId: "", title: "Storekeeper", stage: "queued", primaryTaId: null });
  // Closed: not in the report at all.
  repo.addPosition({ ...base, openingTaId: "ta_j3", title: "Driver", stage: "closed", closedAt: now });

  const report = await desk.buildWeeklyReport("m_lead", now);
  assert(report, "a report was built");
  assert.equal(report.weekOf, reportWeekOf(now));
  assert.equal(report.state, "review", "it waits for a person");
  assert.equal(report.rows.length, 2, "the closed one is not in it");

  const theirs = report.rows.find((r) => r.positionId === open.id);
  assert.equal(theirs?.client, "SAMPLE CLIENT", "the client's name, not their TA id");
  assert.equal(theirs?.shortlisted, 4, "read from the stand-in's pipeline");
  assert.equal(theirs?.daysOpen, 12);
  assert.equal(theirs?.primaryTa, "SAMPLE TA", "TA's own name for the TA");

  const queued = report.rows.find((r) => r.title === "Storekeeper");
  assert.equal(queued?.counts, null, "nothing invented for a position TA has not confirmed");
  assert.match(report.note ?? "", /could not be read/i);

  // Somebody has it to read, and next Monday is already set.
  const task = repo.all().tasks.find((t) => t.subjectId === report.id);
  assert.match(task?.title ?? "", /Read the weekly report/);
  const clock = repo.liveTimers().find((t) => t.kind === "report.weekly");
  assert.equal(clock?.dueAt, nextMondayEightAm(now));

  // Asking twice in one week gives the same report, so the clock and the
  // button cannot make two.
  const again = await desk.buildWeeklyReport("m_lead", now + 2 * DAY);
  assert.equal(again?.id, report.id);
  assert.equal(repo.all().reports.length, 1);
});
