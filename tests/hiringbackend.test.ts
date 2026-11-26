import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "../src/data/seed";
import {
  CALL_NOT_FIT,
  callOutcomeTransition,
  colomboLocalToMs,
  defaultHiringInterviewAt,
  filterByCaller,
  hiringInterviewersFrom,
  hiringView,
  isHiringCaller,
  offerOutcomeTransition,
  problemWithApplicant,
  problemWithHiringCall,
  problemWithCv,
  problemWithCvBytes,
  problemWithHiringDecision,
  problemWithVacancy,
  rejectMessage,
  sectionOfStage,
  vacancySourceLabel,
  STAGE_ACTION,
  problemWithDecisionStage,
  rejectKind,
  slotsThisWeek,
  staleInvites,
  totals,
  triesSoFar,
} from "../src/lib/hiring";

test("Talked - not a fit needs a reason; other call results do not (22 Nov)", () => {
  assert.ok(problemWithHiringCall(CALL_NOT_FIT, ""));
  assert.ok(problemWithHiringCall(CALL_NOT_FIT, "no"));
  assert.equal(problemWithHiringCall(CALL_NOT_FIT, "Not a culture fit"), null);
  assert.equal(problemWithHiringCall("Talked", ""), null);
  assert.equal(problemWithHiringCall("No answer (try 1 of 3)", ""), null);
});

test("the reject message after a call says speaking, after an interview says meeting", () => {
  const a = { id: "a", name: "Hana Perera", source: "x", phone: null, stage: "fits" as const, since: 0, detail: "" };
  assert.match(rejectMessage(a, "Recruiter", true), /thank you for speaking with us for Recruiter/);
  assert.match(rejectMessage(a, "Recruiter"), /thank you for meeting us/);
});

test("a CV is checked by its first bytes, not its name", () => {
  assert.equal(problemWithCvBytes(new TextEncoder().encode("%PDF-1.7")), null);
  assert.equal(problemWithCvBytes(Uint8Array.from([0x50, 0x4b, 3, 4])), null);
  assert.equal(problemWithCvBytes(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0])), null);
  assert.ok(problemWithCvBytes(new TextEncoder().encode("MZ not a document")));
  assert.ok(problemWithCvBytes(new Uint8Array(0)));
});

test("colomboLocalToMs takes optional seconds and refuses garbage", () => {
  assert.equal(colomboLocalToMs("2026-11-22T10:45:30"), Date.parse("2026-11-22T05:15:30Z"));
  assert.ok(Number.isNaN(colomboLocalToMs("tomorrow")));
  assert.ok(Number.isNaN(colomboLocalToMs("")));
});

test("a CV must be a PDF or Word file within the size limit", () => {
  assert.equal(problemWithCv({ name: "Hana CV.pdf", size: 1000 }), null);
  assert.equal(problemWithCv({ name: "hana.docx", size: 1000 }), null);
  assert.ok(problemWithCv({ name: "hana.png", size: 1000 }));
  assert.ok(problemWithCv({ name: "hana.pdf", size: 0 }));
  assert.ok(problemWithCv({ name: "hana.pdf", size: 11 * 1024 * 1024 }));
  assert.equal(problemWithCv({ name: "hana", size: 1000 }), "The file name does not say what kind of file it is.");
});

test("an interview time typed on the form is read as Colombo time, not the server's zone (22 Nov)", () => {
  const at = colomboLocalToMs("2026-11-22T10:45");
  assert.equal(new Date(at).toISOString(), "2026-11-22T05:15:00.000Z");
  assert.equal(new Date(at + 5.5 * 3_600_000).toISOString().slice(11, 16), "10:45");
});

test("hiring validators enforce title, places, source, and reject reason", () => {
  assert.ok(problemWithVacancy("", 2));
  assert.ok(problemWithVacancy("Recruiter", 0));
  assert.equal(problemWithVacancy("Recruiter", 2), null);

  assert.ok(problemWithApplicant("A", "LinkedIn"));
  assert.ok(problemWithApplicant("Dilini Perera", ""));
  assert.equal(problemWithApplicant("Dilini Perera", "LinkedIn"), null);

  assert.ok(problemWithHiringDecision("reject", ""));
  assert.equal(problemWithHiringDecision("reject", "Salary expectations above band"), null);
  assert.equal(problemWithHiringDecision("hire", ""), null);
});

test("hiringView reads real vacancies and applicants from db when present", () => {
  const now = Date.now();
  const db = seed(now);
  db.vacancies = [
    { id: "vac_1", title: "Recruitment Consultant", places: 2, filled: 0, status: "open", checks: ["English"], ownerId: "m_lead", postedAt: now - 86_400_000, createdAt: now - 86_400_000, updatedAt: now },
  ];
  db.applicants = [
    { id: "app_1", vacancyId: "vac_1", name: "Dilini Perera", source: "LinkedIn", phone: "+94 77 555 0140", email: null, stage: "interview", tries: 1, detail: "Interview booked", checkResults: {}, interviewAt: now + 86_400_000, interviewer: "Rushda", place: "Office", score: null, notes: null, salary: null, startDate: null, rejectReason: null, cvFileId: null, createdAt: now, updatedAt: now },
  ];

  const view = hiringView(db, null);
  assert.equal(view.vacancies.length, 1);
  assert.equal(view.vacancies[0]!.applicants.length, 1);
  assert.equal(view.slots.length, 1);
  assert.equal(view.slots[0]!.name, "Dilini Perera");
});

test("PR 7: Scoops & vacancies source, callers, call outcomes, default 4 pm slot, and offer flow (26 Nov)", () => {
  assert.equal(vacancySourceLabel({ source: "scoop", sourceDetail: "Scoop 2" }), "Scoop 2");
  assert.equal(vacancySourceLabel({ source: "job_post", sourceDetail: "TopJobs" }), "Job post · TopJobs");
  assert.equal(vacancySourceLabel({ source: "referral", sourceDetail: "Asma" }), "Referral · Asma");

  // Leadership is never offered as a caller; ops members are.
  assert.equal(isHiringCaller({ role: "ops_owner", active: true }), true);
  assert.equal(isHiringCaller({ role: "ops_lead", active: true }), true);
  assert.equal(isHiringCaller({ role: "director_ops", active: true }), false);
  assert.equal(isHiringCaller({ role: "director_ro", active: true }), false);
  assert.equal(isHiringCaller({ role: "ops_owner", active: false }), false);

  const mine = filterByCaller(
    [
      { id: "1", callerId: "m_owner" },
      { id: "2", callerId: "m_lead" },
      { id: "3", callerId: null },
    ],
    "m_owner",
  );
  assert.deepEqual(mine.map((x) => x.id), ["1"]);

  // Call outcomes: Not interested requires reason; 3rd No answer becomes non_responsive automatically.
  assert.ok(problemWithHiringCall("Not interested", "", ""));
  assert.ok(problemWithHiringCall("Not interested", "no", "Other"));
  assert.equal(problemWithHiringCall("Not interested", "", "Too expensive"), null);
  assert.equal(callOutcomeTransition({ result: "Scheduled", currentTries: 0, note: "4pm" }).stage, "fits");
  assert.equal(
    callOutcomeTransition({ result: "Not interested", currentTries: 1, note: "", notInterestedReason: "Got another offer" }).stage,
    "not_interested",
  );
  assert.equal(callOutcomeTransition({ result: "No answer (try 3 of 3)", currentTries: 2, note: "" }).stage, "non_responsive");
  assert.equal(callOutcomeTransition({ result: "No answer (try 1 of 3)", currentTries: 0, note: "" }).stage, "call");

  // Next working day 16:00 Colombo time (Friday 20 Nov -> Monday 23 Nov 16:00 = 10:30 UTC).
  const fridayMorning = Date.parse("2026-11-20T04:00:00Z");
  const nextSlot = defaultHiringInterviewAt(fridayMorning, []);
  assert.equal(new Date(nextSlot).toISOString(), "2026-11-23T10:30:00.000Z");

  // Leadership interviewers from setting or fallback to director_ops/ops_lead.
  assert.deepEqual(hiringInterviewersFrom("Asma, Usman", []), ["Asma", "Usman"]);
  assert.deepEqual(
    hiringInterviewersFrom("", [
      { name: "Ops One", role: "ops_owner", active: true },
      { name: "Director", role: "director_ops", active: true },
    ]),
    ["Director"],
  );

  // Offer outcomes and sections.
  assert.ok(problemWithHiringDecision("decline", ""));
  assert.equal(problemWithHiringDecision("decline", "Accepted another role"), null);
  assert.equal(offerOutcomeTransition({ decision: "offer", startDate: "1 Dec", salary: "LKR 150k", reason: "" }).stage, "offered");
  const acc = offerOutcomeTransition({ decision: "accept", startDate: "1 Dec", salary: "LKR 150k", reason: "" });
  assert.equal(acc.stage, "hired");
  assert.equal(acc.incrementsFilled, true);
  assert.equal(sectionOfStage("shortlisted"), "shortlisted_offered");
  assert.equal(sectionOfStage("offered"), "shortlisted_offered");
  assert.equal(sectionOfStage("call"), "calling");

  // Calendar slots stay visible once shortlisted or offered.
  const now = Date.now();
  const db = seed(now);
  db.vacancies = [{ id: "v1", title: "Recruiter", places: 1, filled: 0, status: "open", checks: [], ownerId: "m_lead", postedAt: now, createdAt: now, updatedAt: now }];
  db.applicants = [
    { id: "a1", vacancyId: "v1", name: "Shortlisted Person", source: "Scoop", phone: null, email: null, stage: "shortlisted", tries: 1, detail: "Shortlisted", checkResults: {}, interviewAt: now + 86_400_000, interviewer: "Asma", place: "Office", score: 5, notes: null, salary: null, startDate: null, rejectReason: null, cvFileId: null, createdAt: now, updatedAt: now },
  ];
  assert.equal(hiringView(db, null).slots.length, 1);
});

test("hiring audit fixes: reject kind, hold, reopen, guards, week, invites (26 Nov)", () => {
  assert.equal(rejectKind("shortlisted"), "final");
  assert.equal(rejectKind("offered"), "final");
  assert.equal(rejectKind("fits"), "screening");

  const hold = offerOutcomeTransition({ decision: "hold", startDate: null, salary: null, reason: "", currentStage: "offered" });
  assert.deepEqual([hold.stage, hold.detail], ["offered", "Offered · on hold"]);

  assert.equal(STAGE_ACTION.non_responsive?.panel, "call");
  assert.equal(STAGE_ACTION.not_interested?.panel, "call");
  assert.equal(triesSoFar("non_responsive", 3), 0);
  assert.equal(triesSoFar("call", 2), 2);
  const again = callOutcomeTransition({ result: "No answer (try 1 of 3)", currentTries: triesSoFar("non_responsive", 3), note: "" });
  assert.deepEqual([again.stage, again.tries, again.detail], ["call", 1, "No answer · try 1 of 3"]);

  assert.ok(problemWithDecisionStage("accept", "hired"));
  assert.ok(problemWithDecisionStage("reject", "rejected"));
  assert.ok(problemWithDecisionStage("accept", "call"));
  assert.equal(problemWithDecisionStage("accept", "offered"), null);
  assert.equal(problemWithDecisionStage("reject", "call"), null);

  const draft = { state: "draft", templateKey: "hiring.interview_invite", subjectType: "applicant", subjectId: "a1" };
  const others = [{ ...draft, state: "sent" }, { ...draft, subjectId: "a2" }, { ...draft, templateKey: null }];
  assert.deepEqual(staleInvites([draft, ...others], "a1"), [draft]);

  assert.deepEqual(hiringInterviewersFrom("Director of Operations, Ops Lead", [{ name: "Asma", role: "director_ops", active: true }]), ["Asma"]);
  assert.equal(seed(Date.now()).settings.find((s) => s.key === "hiring.interviewers")?.value, "");

  assert.ok(problemWithVacancy("Recruiter", 1, "referral", " "));
  assert.equal(problemWithVacancy("Recruiter", 1, "referral", "Asma"), null);
  assert.equal(problemWithVacancy("Recruiter", 1, "scoop"), null);

  const two = hiringView({ vacancies: [{ id: "v", title: "R", places: 1, filled: 0, status: "open", checks: [], postedAt: 0 }], applicants: ["shortlisted", "offered"].map((stage) => ({ id: stage, vacancyId: "v", stage })) }, null);
  assert.equal(totals(two, 0).decision, 1);

  // Wednesday 18 Nov 2026: the week is Monday 16 to Sunday 22, Colombo time.
  const wed = Date.parse("2026-11-18T06:00:00Z");
  const slot = (iso: string) => ({ at: Date.parse(iso), name: iso, line: "" });
  const slots = [slot("2026-11-15T23:00:00+05:30"), slot("2026-11-16T00:30:00+05:30"), slot("2026-11-22T23:00:00+05:30"), slot("2026-11-23T00:30:00+05:30")];
  assert.deepEqual(slotsThisWeek(slots, wed), slots.slice(1, 3));
});
