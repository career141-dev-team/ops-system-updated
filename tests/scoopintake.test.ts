/**
 * Scoop intake (23 Nov): real PDFs, read into internal hiring, deduplicated, matched to a vacancy; a Scoop
 * email taken a few files at a time from a fake mailbox; and the end-of-day summary, once.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";

import type { ScoopSource } from "@/lib/graphMail";

const DAY = 86_400_000;
// Wednesday 25 Nov 2026 (the sample desk has a holiday on the 24th), 10:00 in Colombo.
const MORNING = Date.UTC(2026, 10, 25, 4, 30);
const EVENING = Date.UTC(2026, 10, 25, 12, 5); // 17:35 Colombo

async function pdf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 740 - i * 18, size: 11, font }));
  return doc.save();
}
const cv = (name: string, email: string, phone: string, nic: string, position: string) =>
  pdf([name, "Colombo", email, "Mobile: " + phone, "NIC: " + nic, "Applying for: " + position, "Several years of experience in agency recruitment, client handling and screening."]);

test("a Scoop of CVs becomes people with the five fields, in the right vacancy, with nobody added twice", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-scoop-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const recruit = await desk.addVacancy({ title: "Recruitment Consultant", places: 1, checks: [], ownerId: "m_owner" });
  const ops = await desk.addVacancy({ title: "Ops Executive", places: 1, checks: [], ownerId: "m_owner" });

  const a = await cv("NIMAL PERERA", "nimal@example.test", "077 123 4567", "912345678V", "Recruitment Consultant");
  const b = await cv("KAMALA DE SILVA", "kamala@example.test", "+94 71 555 0100", "199112345678", "Ops Executive");
  const c = await cv("SUNIL FERNANDO", "sunil@example.test", "0712223344", "881234567V", "Astronaut");
  const again = await cv("NIMAL PERERA", "nimal@example.test", "077 123 4567", "912345678V", "Recruitment Consultant (second copy)");
  const batch = await desk.ingestScoopFiles(
    [{ name: "nimal.pdf", bytes: a }, { name: "kamala.pdf", bytes: b }, { name: "sunil.pdf", bytes: c }, { name: "nimal2.pdf", bytes: again }, { name: "notes.txt", bytes: new TextEncoder().encode("hello") }, { name: "same.pdf", bytes: a }],
    "m_owner",
    null,
    MORNING,
  );

  assert.equal(batch.applicantIds.length, 3);
  assert.deepEqual(batch.duplicates.map((d) => d.name).sort(), ["nimal2.pdf", "same.pdf"]);
  assert.deepEqual(batch.unreadable.map((u) => u.name), ["notes.txt"]);

  const db = await desk.desk();
  const nimal = db.applicants.find((x) => x.name === "Nimal Perera")!;
  assert.deepEqual([nimal.email, nimal.phone, nimal.nic, nimal.targetPosition, nimal.vacancyId, nimal.source, nimal.scoopId], ["nimal@example.test", "077 123 4567", "912345678V", "Recruitment Consultant", recruit.id, "Scoop", batch.id]);
  assert.ok(nimal.cvFileId, "the CV itself is kept");
  const kamala = db.applicants.find((x) => x.name === "Kamala De Silva" || x.name === "Kamala de Silva")!;
  assert.deepEqual([kamala.phone, kamala.nic, kamala.vacancyId], ["071 555 0100", "199112345678", ops.id]);
  const sunil = db.applicants.find((x) => x.name === "Sunil Fernando")!;
  assert.equal(db.vacancies.find((v) => v.id === sunil.vacancyId)!.title, desk.UNSORTED_VACANCY, "no vacancy matches, so it is held to be sorted");
  assert.equal(desk.scoopBatches(db).length, 1);
});

test("a scan with no text still makes a person, named from the file, and says it must be typed", async () => {
  const desk = await import("@/data/desk");
  const blank = await PDFDocument.create();
  blank.addPage();
  const r = await desk.ingestCv({ name: "scan one.pdf", bytes: await blank.save() }, { by: "m_owner", scoopId: "upload-x", now: MORNING });
  assert.equal(r.status, "unreadable");
  assert.ok(r.applicantId);
  const person = (await desk.desk()).applicants.find((x) => x.id === r.applicantId)!;
  assert.equal(person.name, "scan one");
  assert.match(person.detail, /could not be read/);
});

test("a Scoop email is taken a few files at a time, and the mailbox moves on only when the email is done", async () => {
  const desk = await import("@/data/desk");
  const { PER_PASS } = await import("@/lib/scoop");
  const total = PER_PASS + 5;
  const files = await Promise.all(Array.from({ length: total }, (_, i) => cv("PERSON NUMBER" + String.fromCharCode(65 + (i % 26)) + " X" + i, "p" + i + "@example.test", "077 000 " + String(1000 + i), String(900000000 + i) + "V", "Recruitment Consultant")));
  const mailbox: ScoopSource = {
    messages: async () => ({ ok: true, messages: [{ id: "msg-1", at: MORNING, from: "sir@career141.com", subject: "50 CVs for Recruiters" }] }),
    attachments: async () => files.map((f, i) => ({ id: "att-" + i, name: "cv" + i + ".pdf", size: f.length })),
    bytes: async (_m, a) => files[Number(a.slice(4))],
  };

  const first = await desk.runScoopPass("clock", MORNING, mailbox);
  assert.deepEqual([first.ok, first.handled], [true, PER_PASS]);
  let batch = desk.scoopBatches(await desk.desk()).find((b) => b.id === "msg-1")!;
  assert.deepEqual([batch.complete, batch.done.length], [false, PER_PASS]);

  const second = await desk.runScoopPass("clock", MORNING, mailbox);
  assert.equal(second.handled, 5, "it carries on where it stopped");
  batch = desk.scoopBatches(await desk.desk()).find((b) => b.id === "msg-1")!;
  assert.deepEqual([batch.complete, batch.applicantIds.length, batch.found], [true, total, total]);

  const third = await desk.runScoopPass("clock", MORNING, mailbox);
  assert.equal(third.handled, 0, "a finished email is not read again");
  assert.equal((await desk.desk()).applicants.filter((x) => x.scoopId === "msg-1").length, total);
});

test("with no mailbox set up the pass says why and touches nothing", async () => {
  const desk = await import("@/data/desk");
  const r = await desk.runScoopPass("clock", MORNING);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /Mail reading is off|Microsoft|mailbox/);
});

test("the summary is made once, after 17:30 on a working day, as one task for the Ops lead", async () => {
  const desk = await import("@/data/desk");
  const before = (await desk.desk()).tasks.length;
  assert.equal((await desk.runScoopSummary("clock", MORNING)).made, false, "not before its time");
  const made = await desk.runScoopSummary("clock", EVENING);
  assert.deepEqual([made.made, made.batches >= 1], [true, true]);
  const db = await desk.desk();
  const task = db.tasks.find((t) => t.title.startsWith("Scoop summary for"))!;
  assert.equal(db.tasks.length, before + 1);
  assert.match(task.body, /CVs were processed/);
  assert.match(task.body, /did not answer/);
  assert.equal((await desk.runScoopSummary("clock", EVENING + 60_000)).made, false, "once a day");
  assert.equal(task.assigneeId, db.members.find((m) => m.role === "ops_lead")!.id);
  assert.ok(desk.scoopBatches(db).every((b) => b.summarisedAt !== null || b.at < MORNING - DAY));
});
