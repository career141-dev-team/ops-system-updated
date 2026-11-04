/**
 * Interviews (15, Phase 5).
 *
 * The rules that cost money if they are wrong: a time nobody agreed, a slot
 * loop that never ends, a booking with no link, and a drop-out the client
 * hears about an hour before.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMAT_MEANINGS,
  MAX_SLOT_LOOPS,
  ROUND_DECISIONS,
  STATE_MEANINGS,
  type InterviewState,
  canMoveTo,
  interviewInWords,
  interviewersFrom,
  noticeStanding,
  parseSlots,
  problemWithAttendance,
  problemWithInterviewBooking,
  problemWithNewSlots,
  problemWithPick,
  problemWithReference,
  problemWithRelay,
  problemWithRoundDecision,
  problemWithSlots,
  reconfirmAt,
} from "@/lib/interviews";

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Monday 9 November 2026, 10:00 Colombo.
const MONDAY_TEN = Date.UTC(2026, 10, 9, 4, 30);

test("the client's times are read as Colombo times, and rubbish is refused", () => {
  const { slots, bad } = parseSlots("2026-11-09 10:00\n2026-11-10 14:30\n");
  assert.deepEqual(slots, [MONDAY_TEN, Date.UTC(2026, 10, 10, 9, 0)]);
  assert.deepEqual(bad, []);

  // The same time twice is one time, and they come back in order.
  const twice = parseSlots("2026-11-10 14:30\n2026-11-09 10:00\n2026-11-09 10:00");
  assert.deepEqual(twice.slots, [MONDAY_TEN, Date.UTC(2026, 10, 10, 9, 0)]);

  assert.match(problemWithSlots("sometime Tuesday") ?? "", /not a date and time/i);
  assert.match(problemWithSlots("") ?? "", /at least one time/i);
  assert.match(problemWithSlots("2020-01-01 10:00") ?? "", /has gone/i);
  assert.equal(problemWithSlots("2026-11-09 10:00", MONDAY_TEN - DAY), null);
});

test("the candidate can only take a time the client offered", () => {
  const slots = [MONDAY_TEN, MONDAY_TEN + DAY];
  assert.equal(problemWithPick(MONDAY_TEN, slots, MONDAY_TEN - DAY), null);
  assert.match(problemWithPick(MONDAY_TEN + 2 * DAY, slots, MONDAY_TEN - DAY) ?? "", /not one of the times/i);
  assert.match(problemWithPick(NaN, slots) ?? "", /Pick one/);
  assert.match(problemWithPick(MONDAY_TEN, slots, MONDAY_TEN + DAY) ?? "", /has gone/i);
});

test("the slot loop stops at three and asks for a back-up", () => {
  assert.equal(problemWithNewSlots(0), null);
  assert.equal(problemWithNewSlots(2), null);
  const stopped = problemWithNewSlots(3) ?? "";
  assert.match(stopped, /back-up/i);
  assert.equal(MAX_SLOT_LOOPS, 3);
  // The number is a setting, so a desk that changes it changes the loop.
  assert.equal(problemWithNewSlots(2, 2) === null, false);
});

test("a booking is refused until it is something a client can attend", () => {
  const good = {
    at: MONDAY_TEN,
    round: 1,
    format: "online",
    interviewers: "hr@example.test\nmd@example.test",
    whereOrLink: "https://teams.example.test/meet/1",
  };
  assert.equal(problemWithInterviewBooking(good, MONDAY_TEN - DAY), null);

  assert.match(problemWithInterviewBooking({ ...good, at: NaN }) ?? "", /day and time/i);
  assert.match(problemWithInterviewBooking(good, MONDAY_TEN + DAY) ?? "", /has gone/i);
  assert.match(problemWithInterviewBooking({ ...good, format: "carrier pigeon" }, MONDAY_TEN - DAY) ?? "", /online/i);
  assert.match(problemWithInterviewBooking({ ...good, interviewers: " " }, MONDAY_TEN - DAY) ?? "", /Who is interviewing/i);
  // An online interview with no link, and an onsite one with no address.
  assert.match(problemWithInterviewBooking({ ...good, whereOrLink: "" }, MONDAY_TEN - DAY) ?? "", /meeting link/i);
  assert.match(
    problemWithInterviewBooking({ ...good, format: "onsite", whereOrLink: "" }, MONDAY_TEN - DAY) ?? "",
    /Where is it/i,
  );
  // On the phone needs neither.
  assert.equal(problemWithInterviewBooking({ ...good, format: "phone", whereOrLink: "" }, MONDAY_TEN - DAY), null);

  assert.deepEqual(interviewersFrom("hr@example.test\nnot an address\nmd@example.test"), [
    "hr@example.test",
    "md@example.test",
  ]);
});

test("the reminder is nine the morning before, not a day in hours", () => {
  // 10:00 Monday → 09:00 Sunday, Colombo, which is 03:30 UTC.
  assert.equal(reconfirmAt(MONDAY_TEN), Date.UTC(2026, 10, 8, 3, 30));
  // An early-morning interview still reminds the day before, not the night.
  const earlyTuesday = Date.UTC(2026, 10, 10, 3, 0);
  assert.equal(reconfirmAt(earlyTuesday), Date.UTC(2026, 10, 9, 3, 30));
});

test("a drop-out notice says how late it is, and never refuses to go", () => {
  const plenty = noticeStanding(MONDAY_TEN, MONDAY_TEN - 2 * DAY);
  assert.equal(plenty.ok, true);
  assert.equal(plenty.late, false);
  assert.match(plenty.what, /what we promised/);

  const tight = noticeStanding(MONDAY_TEN, MONDAY_TEN - 5 * HOUR);
  assert.equal(tight.ok, true);
  assert.equal(tight.late, true);
  assert.match(tight.what, /phone them/);

  const awful = noticeStanding(MONDAY_TEN, MONDAY_TEN - HOUR);
  assert.equal(awful.ok, true, "it still goes - a late notice is better than none");
  assert.match(awful.what, /phone them first/);

  const gone = noticeStanding(MONDAY_TEN, MONDAY_TEN + HOUR);
  assert.equal(gone.ok, false);
});

test("attendance is only marked on a booked interview that has happened", () => {
  assert.equal(problemWithAttendance("booked", MONDAY_TEN, MONDAY_TEN + HOUR), null);
  assert.equal(problemWithAttendance("reconfirmed", MONDAY_TEN, MONDAY_TEN + HOUR), null);
  assert.match(problemWithAttendance("slots", MONDAY_TEN, MONDAY_TEN + HOUR) ?? "", /was booked/);
  assert.match(problemWithAttendance("booked", MONDAY_TEN, MONDAY_TEN - DAY) ?? "", /not happened yet/);
});

test("a rejection after an interview carries the client's words", () => {
  assert.equal(problemWithRoundDecision("selected", ""), null);
  assert.equal(problemWithRoundDecision("next", ""), null);
  assert.match(problemWithRoundDecision("rejected", "") ?? "", /in the client's own words/i);
  assert.match(problemWithRoundDecision("rejected", "no") ?? "", /own words/i);
  assert.equal(problemWithRoundDecision("rejected", "Not enough audit experience."), null);
  assert.match(problemWithRoundDecision("maybe", "") ?? "", /what the client decided/i);
  assert.deepEqual(Object.keys(ROUND_DECISIONS).sort(), ["next", "rejected", "selected"]);
});

test("a reference happens only when the client asks, and is relayed as said", () => {
  assert.match(problemWithReference(false, "SAMPLE CANDIDATE") ?? "", /only taken when the client asks/i);
  assert.equal(problemWithReference(true, "SAMPLE CANDIDATE"), null);
  assert.match(problemWithRelay("fine") ?? "", /what the referee actually said/i);
  assert.equal(problemWithRelay("Worked for them four years, would have him back."), null);
});

test("a held interview is history; a cancelled one goes back to the times", () => {
  assert.equal(canMoveTo("slots", "agreed"), true);
  assert.equal(canMoveTo("agreed", "booked"), true);
  assert.equal(canMoveTo("booked", "reconfirmed"), true);
  assert.equal(canMoveTo("attended", "booked"), false, "the next round is its own interview");
  assert.equal(canMoveTo("cancelled", "slots"), true);
  assert.equal(canMoveTo("no_show", "slots"), true);
  // Every state a row can be in has words for a person.
  for (const state of ["slots", "agreed", "booked", "reconfirmed", "attended", "no_show", "cancelled"]) {
    assert(STATE_MEANINGS[state as InterviewState], state + " has no wording");
  }
});

test("the line about an interview says where it is and when", () => {
  const row = { state: "booked", scheduler: "us", at: MONDAY_TEN, round: 2, slotLoops: 1, format: "online" };
  const words = interviewInWords(row, MONDAY_TEN - 3 * DAY);
  assert.match(words, /Booked/);
  assert.match(words, /round 2/);
  assert.match(words, /in 3 days/);
  assert.match(words, new RegExp(FORMAT_MEANINGS.online));

  assert.match(interviewInWords({ ...row, at: MONDAY_TEN }, MONDAY_TEN - 4 * HOUR), /in 4 hours/);
  assert.match(interviewInWords({ ...row, at: MONDAY_TEN }, MONDAY_TEN + 2 * DAY), /was 2 days ago/);

  const waiting = interviewInWords({ ...row, state: "slots", at: null, slotLoops: 2 }, MONDAY_TEN);
  assert.match(waiting, /agreeing the time/);
  assert.match(waiting, /round 2 of times/);
  assert.match(
    interviewInWords({ ...row, state: "slots", at: null, scheduler: "client" }, MONDAY_TEN),
    /waiting for the client's date/,
  );
});

test("booking one tells TA, drafts the invite, and starts both clocks", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-int-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const at = now + 5 * DAY;
  const interview = repo.addInterview({
    applicationTaId: "ta_a3",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE THREE",
    scheduler: "us",
    state: "agreed",
    round: 1,
    slots: [at],
    slotLoops: 1,
    at,
    format: "online",
    interviewers: ["hr@example.test"],
    whereOrLink: "https://teams.example.test/meet/1",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: "m_owner",
  });

  await desk.startInterviewClocks({ ...interview, at }, now);
  const clocks = repo.liveTimers().filter((t) => t.subjectId === interview.id);
  assert.equal(clocks.length, 2, "the reminder and the day itself");
  assert.equal(clocks.find((c) => c.kind === "interview.reconfirm")?.dueAt, reconfirmAt(at));
  assert.equal(clocks.find((c) => c.kind === "interview.day")?.dueAt, at);

  // The day before: the client's reminder is drafted and the TA is asked.
  const reminded = await desk.remindAboutInterview(interview.id, now);
  assert.equal(reminded.ok, false, "it is not booked yet, so nothing is drafted");

  repo.patchInterview(interview.id, { state: "booked" }, "m_owner", "interview.booked", null);
  const again = await desk.remindAboutInterview(interview.id, now);
  assert.equal(again.ok, true);
  const draft = repo.all().messages.find((m) => m.templateKey === "interview.reminder");
  assert.deepEqual(draft?.to, ["hr@example.test"]);
  assert.equal(draft?.state, "draft", "nothing reaches a client unapproved");
  assert.match(repo.all().tasks.find((t) => t.title.startsWith("Ask the TA"))?.body ?? "", /never write to a candidate/);
});

test("a candidate pulling out drafts the notice, stops the clocks, asks for a back-up", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-int2-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  // Three hours away: the notice still goes, and says to phone them.
  const at = now + 3 * HOUR;
  const interview = repo.addInterview({
    applicationTaId: "ta_a3",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE THREE",
    scheduler: "us",
    state: "booked",
    round: 1,
    slots: [at],
    slotLoops: 1,
    at,
    format: "online",
    interviewers: ["hr@example.test"],
    whereOrLink: "https://teams.example.test/meet/1",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: "m_owner",
  });
  await desk.startInterviewClocks({ ...interview, at }, now);

  const answer = await desk.noticeCandidateOut(interview.id, "Took another offer.", "m_owner", now);
  assert.equal(answer.ok, true);
  assert.match(answer.what, /phone/i, "under a day's notice is said plainly");

  const saved = repo.interviewIn(interview.id);
  assert.equal(saved?.state, "cancelled");
  assert.equal(saved?.reason, "Took another offer.");
  const notice = repo.all().messages.find((m) => m.templateKey === "interview.dropout_notice");
  assert.equal(notice?.state, "draft");
  assert.match(notice?.body ?? "", /SAMPLE CANDIDATE THREE/);
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === interview.id).length, 0, "its clocks are stopped");
  assert.match(repo.all().tasks.find((t) => t.title.startsWith("A back-up"))?.title ?? "", /back-up/);
});

test("TA's own events move the interview without anybody typing", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-int3-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const at = now + 2 * DAY;
  const interview = repo.addInterview({
    applicationTaId: "ta_a3",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE THREE",
    scheduler: "us",
    state: "booked",
    round: 1,
    slots: [at],
    slotLoops: 1,
    at,
    format: "online",
    interviewers: ["hr@example.test"],
    whereOrLink: "https://teams.example.test/meet/1",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: "m_owner",
  });

  // The TA reconfirmed the candidate.
  await desk.takeInterviewEvent("interview.confirmed", { applicationId: "ta_a3" }, now);
  assert.equal(repo.interviewIn(interview.id)?.state, "reconfirmed");

  // The TA phoned them afterwards: their words are drafted for the client,
  // and waiting for the morning rather than going out at night.
  await desk.takeInterviewEvent(
    "interview.feedback",
    { applicationId: "ta_a3", feedback: "Thought it went well, happy with the package." },
    now,
  );
  const saved = repo.interviewIn(interview.id);
  assert.match(saved?.candidateFeedback ?? "", /went well/);
  const draft = repo.all().messages.find((m) => m.templateKey === "interview.client_feedback");
  assert.equal(draft?.state, "draft");

  // An event about a candidate we have no interview for is left alone.
  await desk.takeInterviewEvent("interview.confirmed", { applicationId: "ta_nobody" }, now);
  assert.equal(repo.all().interviews.length, 1, "no row invented from an event");
});
