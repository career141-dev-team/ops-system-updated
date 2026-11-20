import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "../src/data/seed";
import { hiringView, problemWithApplicant, problemWithHiringDecision, problemWithVacancy } from "../src/lib/hiring";

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
