/**
 * After the set has gone (15, Phase 4 steps 6 to 13).
 *
 * Three clocks start when the client receives a set, and they are not the same
 * kind of thing. The ownership window is the one that costs money, so it is
 * counted in working days exactly as the agreement words it; the chase stops
 * rather than nagging; and the hold never closes by itself.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_DECISIONS,
  HOLD_AFTER_DAYS,
  OWNERSHIP_WORKING_DAYS,
  claimVerdict,
  holdDueAt,
  nextFeedbackStep,
  ownershipWindow,
  problemWithDecision,
  problemWithHold,
  problemWithLift,
  silentDays,
  windowInWords,
} from "@/lib/clientFeedback";

const DAY = 86_400_000;
// Tuesday 3 November 2026, 09:30 Colombo.
const TUESDAY = Date.UTC(2026, 10, 3, 4, 0);

test("the ownership window is seven working days, not seven days", () => {
  const window = ownershipWindow(TUESDAY);
  // Seven working days from a Tuesday lands on the Thursday of the next week:
  // the weekend does not count, which is the whole point of the wording.
  assert.equal(new Date(window.closesAt).getUTCDay(), 4, "a Thursday");
  assert.equal(window.closesAt, TUESDAY + 9 * DAY, "nine calendar days, two of them a weekend");
  assert.equal(window.warnAt, TUESDAY + 7 * DAY, "two working days before it closes");
  assert.equal(OWNERSHIP_WORKING_DAYS, 7);
});

test("a holiday inside the window pushes it out", () => {
  // The Wednesday is a holiday, so the seven working days reach a day later.
  const plain = ownershipWindow(TUESDAY);
  const withHoliday = ownershipWindow(TUESDAY, ["2026-11-04"]);
  assert.equal(withHoliday.closesAt, plain.closesAt + DAY);
});

test("a claim inside the window is theirs; after it, it is refused", () => {
  const window = ownershipWindow(TUESDAY);

  const inside = claimVerdict(window.closesAt, window.closesAt - DAY);
  assert.equal(inside.verdict, "dropped");
  assert.match(inside.because, /inside the seven working days/i);
  assert.equal(inside.templateKey, "claim.noted");

  const onTheDay = claimVerdict(window.closesAt, window.closesAt);
  assert.equal(onTheDay.verdict, "dropped", "the last day still counts for the client");

  const late = claimVerdict(window.closesAt, window.closesAt + 1);
  assert.equal(late.verdict, "refused");
  assert.match(late.because, /after the seven working days/i);
  assert.equal(late.templateKey, "claim.refused");
});

test("the window says where it stands, in working days", () => {
  const window = ownershipWindow(TUESDAY);
  assert.match(windowInWords(window, TUESDAY), /working days left/);
  assert.match(windowInWords(window, window.closesAt - 1), /closes today/);
  assert.match(windowInWords(window, window.closesAt + DAY), /has closed/);
  assert.match(windowInWords(window, window.closesAt + DAY), /refused/);
});

test("silence is counted from the last thing the client said", () => {
  const received = TUESDAY;
  assert.equal(silentDays(received, null, received + 2 * DAY), 2);
  // A client who answered about one candidate is not a silent client.
  assert.equal(silentDays(received, received + 2 * DAY, received + 3 * DAY), 1);
  assert.equal(silentDays(received, null, received), 0);
});

test("the chase ladder: ask, then call, then stop", () => {
  const rules = { chaseDays: 1, stopAfterSilentDays: 4 };
  assert.equal(nextFeedbackStep(0, rules).what, "wait");
  assert.equal(nextFeedbackStep(1, rules).what, "chase");
  assert.equal(nextFeedbackStep(2, rules).what, "call");
  assert.equal(nextFeedbackStep(3, rules).what, "call");
  // The owner's rule: stop chasing a client who is clearly not answering, and
  // let the hold clock decide.
  const stopped = nextFeedbackStep(4, rules);
  assert.equal(stopped.what, "stop");
  assert.match(stopped.because, /hold clock/);
  assert.match(nextFeedbackStep(1, rules).because, /in writing/);
  assert.match(nextFeedbackStep(2, rules).because, /rings them/);
});

test("the hold is two calendar weeks from receipt", () => {
  assert.equal(holdDueAt(TUESDAY), TUESDAY + 14 * DAY);
  assert.equal(HOLD_AFTER_DAYS, 14);
  assert.equal(holdDueAt(TUESDAY, 21), TUESDAY + 21 * DAY);
});

test("a hold needs a reason, and so does lifting one", () => {
  assert.match(problemWithHold("") ?? "", /write why/i);
  assert.match(problemWithHold("  ok") ?? "", /write why/i);
  assert.equal(problemWithHold("Silent for two weeks after set 1."), null);
  assert.match(problemWithLift("") ?? "", /say what changed/i);
  assert.equal(problemWithLift("They rang and want two more CVs."), null);
});

test("a client's rejection carries the client's own words", () => {
  assert.deepEqual([...CLIENT_DECISIONS], ["shortlisted", "rejected"]);
  assert.match(problemWithDecision("maybe", "anything") ?? "", /shortlisted or rejected/i);
  // The owner's rule, and TA writes the candidate's notice from this.
  assert.match(problemWithDecision("rejected", "") ?? "", /what the client said/i);
  assert.match(problemWithDecision("rejected", "no") ?? "", /what the client said/i);
  assert.equal(problemWithDecision("rejected", "Too junior for the role."), null);
  // Shortlisting needs no reason: the interview is the reason.
  assert.equal(problemWithDecision("shortlisted", ""), null);
});

test("the clocks a set starts all count from receipt, and a reply stops the chasing", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-feedback-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const set = repo.addClientSet({
    taRoundId: "ta_round1",
    openingTaId: "ta_j1",
    setNumber: 1,
    clientId: null,
    clientTaId: "ta_c1",
    name: "SAMPLE CLIENT > HEAD OF FINANCE > SET 1",
    role: "Head of finance",
    state: "sent",
    candidates: [{ applicationTaId: "ta_a1", name: "SAMPLE ONE", fileId: "f_1", problem: null }],
    dueAt: null,
    sentAt: now,
    sentMessageId: null,
    sentTo: ["hr@example.test"],
    receivedAt: now,
    reason: null,
    ownerId: "m_owner",
  });

  await desk.startReceiptClocks(await desk.desk(), set, now);
  const started = repo
    .liveTimers()
    .filter((t) => t.subjectId === set.id)
    .map((t) => t.kind)
    .sort();
  assert.deepEqual(started, ["feedback.chase", "hire.unreported", "set.ownership", "silence.hold"]);

  // Every one of them counts from receipt, not from sending.
  const ownership = repo.liveTimers().find((t) => t.kind === "set.ownership" && t.subjectId === set.id);
  assert.equal(ownership?.startsAt, now);
  // The desk's own holidays, not none: the sample has 24 Nov 2026, and with []
  // this failed whenever that day fell inside the window (13 Nov).
  const holidays = (await desk.desk()).holidays.map((h) => h.date);
  assert.equal(ownership?.dueAt, ownershipWindow(now, holidays).closesAt);

  // The client answers: the chasing stops, the ownership window does not -
  // it is a promise in the agreement, not a chase.
  const stopped = await desk.cancelClocksFor(await desk.desk(), "clientSet", set.id, "m_owner", "They answered.", [
    "feedback.chase",
    "feedback.call",
    "silence.hold",
  ]);
  assert.equal(stopped, 2);
  assert.deepEqual(
    repo
      .liveTimers()
      .filter((t) => t.subjectId === set.id)
      .map((t) => t.kind)
      .sort(),
    ["hire.unreported", "set.ownership"],
  );
});
