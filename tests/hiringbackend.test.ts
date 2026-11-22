import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "../src/data/seed";
import { CALL_NOT_FIT, colomboLocalToMs, hiringView, problemWithApplicant, problemWithHiringCall, problemWithCv, problemWithCvBytes, problemWithHiringDecision, problemWithVacancy, rejectMessage } from "../src/lib/hiring";

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
