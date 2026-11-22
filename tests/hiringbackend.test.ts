import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "../src/data/seed";
import { CALL_NOT_FIT, colomboLocalToMs, hiringView, problemWithApplicant, problemWithHiringCall, problemWithCv, problemWithHiringDecision, problemWithVacancy } from "../src/lib/hiring";

test("a call with a Not OK check cannot be logged as plain Talked; not a fit needs a reason (22 Nov)", () => {
  assert.ok(problemWithHiringCall("Talked", 1, "fine"));
  assert.equal(problemWithHiringCall("Talked", 0, ""), null);
  assert.ok(problemWithHiringCall(CALL_NOT_FIT, 1, ""));
  assert.equal(problemWithHiringCall(CALL_NOT_FIT, 1, "Not a culture fit"), null);
  assert.equal(problemWithHiringCall("No answer (try 1 of 3)", 1, ""), null);
});

test("a CV must be a PDF or Word file within the size limit", () => {
  assert.equal(problemWithCv({ name: "Hana CV.pdf", size: 1000 }), null);
  assert.equal(problemWithCv({ name: "hana.docx", size: 1000 }), null);
  assert.ok(problemWithCv({ name: "hana.png", size: 1000 }));
  assert.ok(problemWithCv({ name: "hana.pdf", size: 0 }));
  assert.ok(problemWithCv({ name: "hana.pdf", size: 30 * 1024 * 1024 }));
});

test("an interview time typed on the form is Colombo time, whatever the server clock (22 Nov)", () => {
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
