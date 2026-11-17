/**
 * The client agreement. Two incidents from the owner's board are what these
 * rules exist for: a draft that went out with placeholders still in it, and a
 * chase done by hand from somebody's tracker.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CHASE_PLAN,
  type EsaFields,
  type EsaState,
  canMoveTo,
  chaseStep,
  agreementVersions,
  checkTemplate,
  coverDraft,
  coverEmail,
  nextDraftVersion,
  defaultFields,
  expiresAt,
  missingFields,
  nextChaseAt,
  problemWithChanges,
  problemWithDraft,
  problemWithSigned,
  whereItStands,
} from "@/lib/esa";

const DAY = 86_400_000;

const filled = (): EsaFields => ({
  companyName: "SAMPLE CLIENT (Pvt) Ltd",
  registrationNo: "PV 123456",
  companyAddress: "1 Sample Road, Colombo",
  clientBusiness: "manufacturing tiles",
  taxNo: "123456789",
  signatoryName: "Sample contact",
  signatoryEmail: "hr@example.test",
  signatoryTitle: "Head of HR",
  signatoryPhone: "+94 77 000 0000",
  feeMonths: "1",
  feeBasis: "gross",
  guaranteeDays: "90",
  paymentDays: "30",
  replacementWorkingDays: "60",
  refundPct: "25",
});

test("a blank required field blocks the draft, and is named", () => {
  assert.equal(problemWithDraft(filled()), null);

  // The owner's real ESA (the Valtrix draft, 17 Nov) never prints the client's
  // registration number, so a blank one no longer blocks; the address does.
  assert.equal(problemWithDraft({ ...filled(), registrationNo: "  " }), null);
  const noAddress = { ...filled(), companyAddress: "  " };
  assert.deepEqual(missingFields(noAddress).map((f) => f.key), ["companyAddress"]);
  assert.match(problemWithDraft(noAddress) ?? "", /still blank: registered address/i);

  const empty = problemWithDraft({});
  assert.match(empty ?? "", /company, as it signs/i);
  assert.match(empty ?? "", /what their business is/i);
});

test("an optional field being blank changes nothing", () => {
  // The tax number and the call notes are the only optional ones left: every
  // other field is a hole in the real template, and a hole nothing fills stops
  // the document being made at all (3 Nov).
  const noTax = { ...filled(), notes: "", taxNo: "" };
  assert.equal(problemWithDraft(noTax), null);
});

test("the numbers start from the settings", () => {
  const fields = defaultFields({ guaranteeDays: 90, paymentDays: 30, replacementWorkingDays: 60, refundPct: 25 });
  assert.equal(fields.guaranteeDays, "90");
  assert.equal(fields.feeMonths, "1", "one month of salary is standard");
  assert.equal(fields.feeBasis, "gross");
  // A client on a different guarantee is a settings change, not a code change.
  const other = defaultFields({ guaranteeDays: 60, paymentDays: 45, replacementWorkingDays: 30, refundPct: 10 });
  assert.equal(other.guaranteeDays, "60");
  assert.equal(other.paymentDays, "45");
});

test("the chase is the owner's plan: email, WhatsApp, email, WhatsApp, email, call", () => {
  assert.deepEqual(CHASE_PLAN.map((s) => s.channel), ["email", "whatsapp", "email", "whatsapp", "email", "call"]);
  assert.equal(chaseStep(1)?.templateKey, "esa.chase.email.1");
  assert.equal(chaseStep(6)?.channel, "call", "the last resort is a person, not another email");
  assert.equal(chaseStep(7), null);
});

test("each chase is due a fixed number of days after the one before", () => {
  const first = nextChaseAt(0, 1_000);
  assert.deepEqual(first, { step: 1, dueAt: 1_000 + 2 * DAY });
  assert.deepEqual(nextChaseAt(2, 1_000), { step: 3, dueAt: 1_000 + 3 * DAY });
  assert.equal(nextChaseAt(6, 1_000), null, "after the call there is nothing automatic left");
});

test("two weeks are counted in calendar days, not working days", () => {
  const sent = Date.UTC(2026, 10, 2);
  assert.equal(expiresAt(sent, 14), sent + 14 * DAY);
});

test("the agreement can only move where it is allowed to", () => {
  assert.equal(canMoveTo("draft", "sent"), true);
  assert.equal(canMoveTo("sent", "signed"), true);
  assert.equal(canMoveTo("signed", "countersigned"), true);
  assert.equal(canMoveTo("draft", "signed"), false, "nothing is signed that was never sent");
  assert.equal(canMoveTo("countersigned", "sent"), false, "a finished agreement does not reopen");
  assert.equal(canMoveTo("declined", "sent"), false);
  assert.equal(canMoveTo("expired", "sent"), true, "an expired one can be sent again if they come back");
  assert.equal(canMoveTo("chasing", "negotiating"), true, "a client can ask for changes mid-chase");
  assert.equal(canMoveTo("negotiating", "sent"), true, "the next version goes out");
  assert.equal(canMoveTo("negotiating", "signed"), true, "they can also just sign it as it is");
  assert.equal(canMoveTo("signed", "negotiating"), false, "a signed agreement is not reopened");
});

test("what the client wants changed has to be written down", () => {
  assert.match(problemWithChanges("  ") ?? "", /write down what they want/i);
  assert.match(problemWithChanges("fee") ?? "", /write down what they want/i);
  assert.equal(problemWithChanges("Fee of one month on basic, not gross."), null);
});

test("where it stands reads as a sentence, at every stage", () => {
  const now = Date.UTC(2026, 10, 10);
  const sent = Date.UTC(2026, 10, 2);
  const base = { state: "sent" as EsaState, chaseStep: 0, sentAt: sent, expiresAt: expiresAt(sent, 14) };

  assert.match(whereItStands(base, now), /Sent\. Next: first reminder by email/);
  assert.match(whereItStands({ ...base, chaseStep: 1 }, now), /chased 1 time/);
  assert.match(whereItStands({ ...base, chaseStep: 2 }, now), /chased 2 times/);
  assert.match(whereItStands(base, now), /6 days left of the two weeks/);
  assert.match(whereItStands({ ...base, chaseStep: 6 }, now), /somebody must call them/);
  assert.match(whereItStands({ ...base, state: "signed" }, now), /Waiting for the Director/);
  assert.match(whereItStands({ ...base, state: "countersigned" }, now), /gone back to the client/);
  assert.match(whereItStands({ ...base, state: "declined" }, now), /No work starts/);
  assert.match(whereItStands({ ...base, state: "draft", sentAt: null, expiresAt: null }, now), /Not sent yet/);
  assert.match(whereItStands(base, Date.UTC(2026, 10, 20)), /the two weeks are up/);
});

test("a signed copy needs a file and somebody saying they looked at it", () => {
  assert.match(problemWithSigned({ fileId: null, checked: true }) ?? "", /Upload the signed copy/);
  assert.match(problemWithSigned({ fileId: "f_1", checked: false }) ?? "", /signed, dated and sealed/);
  assert.equal(problemWithSigned({ fileId: "f_1", checked: true }), null);
});

test("a settled agreement leaves no clocks running", async () => {
  // The two-week clock is not a chase, so a reply does not stop it. What stops
  // it is the agreement being settled, which is what this proves.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-esa-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  for (const kind of ["esa.chase", "esa.decline"]) {
    repo.startTimer({
      kind,
      subjectType: "esa",
      subjectId: "esa_x",
      startsAt: now,
      dueAt: now + 14 * DAY,
      warnAt: null,
      ownerId: "m_owner",
      payload: {},
    });
  }
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === "esa_x").length, 2);

  const stopped = await desk.cancelClocksFor(await desk.desk(), "esa", "esa_x", "m_owner", "It is signed.");
  assert.equal(stopped, 2);
  assert.equal(repo.liveTimers().filter((t) => t.subjectId === "esa_x").length, 0);
  assert.equal(repo.audit()[0].reason, "It is signed.");
});

test("the clock drafts the chase itself when it fires", async () => {
  // Until 3 Nov a fired chase clock only left a task, so the chase waited for
  // somebody to press a button. The clock is what is supposed to remember.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-chase-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const lead = repo.addLead({
    company: "SAMPLE CLIENT (Pvt) Ltd",
    nameKey: "sample client (pvt) ltd",
    contactName: "Sample contact",
    contactEmail: "hr@example.test",
    contactPhone: "+94 77 000 0000",
    source: "email",
    industry: "Manufacturing",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: null,
    industryConfirmedBy: null,
    state: "waiting_agreement",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    ownerId: "m_owner",
    createdBy: "m_owner",
  });
  const esa = repo.addAgreement({
    leadId: lead.id,
    clientTaId: null,
    state: "sent",
    version: 1,
    fields: { ...filled() },
    draftFileId: null,
    sentAt: now - 3 * DAY,
    sentMessageId: null,
    chaseStep: 0,
    expiresAt: now + 11 * DAY,
    signedAt: null,
    signedFileId: null,
    countersignedAt: null,
    countersignedFileId: null,
    reason: null,
    ownerId: "m_owner",
  });
  repo.startTimer({
    kind: "esa.chase",
    subjectType: "esa",
    subjectId: esa.id,
    startsAt: now - 2 * DAY,
    dueAt: now - 1_000,
    warnAt: null,
    ownerId: "m_owner",
    payload: { label: "SAMPLE CLIENT", step: "1" },
  });

  const pass = await desk.runClocks(now);
  assert.equal(pass.fired >= 1, true, "the overdue chase clock fired");

  const drafts = repo.all().messages.filter((m) => m.subjectId === esa.id && m.state === "draft");
  assert.equal(drafts.length, 1, "the chase is drafted, not only remembered");
  assert.equal(drafts[0].channel, "email", "step 1 of the owner's plan is an email");
  assert.deepEqual(drafts[0].to, ["hr@example.test"]);
  assert.match(drafts[0].subject, /SAMPLE CLIENT/, "the client's name is filled in");
  assert.doesNotMatch(drafts[0].body + drafts[0].subject, /\{\{/, "no hole is left unfilled");

  const after = repo.all().agreements.find((e) => e.id === esa.id);
  assert.equal(after?.state, "chasing");
  assert.equal(after?.chaseStep, 1);

  // And the one after it is already waiting, so the plan carries on by itself.
  const next = repo.liveTimers().filter((t) => t.subjectId === esa.id && t.kind === "esa.chase");
  assert.equal(next.length, 1, "the next chase has its own clock");
  assert.equal(next[0].dueAt, now + 2 * DAY, "two days to the WhatsApp message");
});

test("a settled agreement is not chased, even by a clock already in flight", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-chase-settled-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  const esa = repo.addAgreement({
    leadId: "ld_gone",
    clientTaId: null,
    state: "signed",
    version: 1,
    fields: { ...filled() },
    draftFileId: null,
    sentAt: now - 5 * DAY,
    sentMessageId: null,
    chaseStep: 2,
    expiresAt: now + 9 * DAY,
    signedAt: now,
    signedFileId: "f_1",
    countersignedAt: null,
    countersignedFileId: null,
    reason: null,
    ownerId: "m_owner",
  });

  const answer = await desk.chaseTheAgreement(esa.id, "m_owner", now);
  assert.equal(answer.ok, false);
  assert.match(answer.what, /not waiting for a signature/i);
  assert.equal(repo.all().messages.filter((m) => m.subjectId === esa.id).length, 0);
});

test("a negotiation stops the chasing, and only the chasing", async () => {
  // The two weeks are the outer limit from sending, so they keep running while
  // the terms are agreed; if they run out, a person decides.
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-negotiate-"));
  process.env.OPS_STORE = "json";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  for (const kind of ["esa.chase", "esa.decline"]) {
    repo.startTimer({
      kind,
      subjectType: "esa",
      subjectId: "esa_n",
      startsAt: now,
      dueAt: now + 2 * DAY,
      warnAt: null,
      ownerId: "m_owner",
      payload: {},
    });
  }

  const stopped = await desk.cancelClocksFor(
    await desk.desk(),
    "esa",
    "esa_n",
    "m_owner",
    "The client wants changes.",
    ["esa.chase"],
  );
  assert.equal(stopped, 1);
  const left = repo.liveTimers().filter((t) => t.subjectId === "esa_n");
  assert.deepEqual(
    left.map((t) => t.kind),
    ["esa.decline"],
    "the two-week clock is still running",
  );
});

test("the template check names holes nothing fills and required fields the template never prints", () => {
  const check = checkTemplate(["companyName", "effectiveDate", "mysteryHole"]);
  assert.deepEqual(check.unknown, ["mysteryHole"], "effectiveDate is filled by the system, so it is not unknown");
  assert(check.unused.some((f) => f.key === "companyAddress"));
  assert(!check.unused.some((f) => f.key === "registrationNo"), "an optional field may be left out of the template");
  assert(!check.unused.some((f) => f.key === "companyName"));
  assert(!check.unused.some((f) => f.key === "notes"), "an optional field may be left out of the template");
  assert(!check.unused.some((f) => f.key === "signatoryEmail" || f.key === "signatoryPhone"), "the send and the chase need them; the ESA never prints them");
});

test("the cover email carries this client's terms and refuses an empty hole", () => {
  const wording = {
    subject: "{{client}} · Executive Search Agreement",
    body: "Dear {{contact}},\n\nSee Clause 5.1: {{feeMonths}} month(s) {{feeBasis}} salary, within {{paymentDays}} days. Guarantee {{guaranteeDays}} days.",
  };
  const done = coverDraft(wording, { ...filled(), companyName: "Smith & Co", signatoryName: "Ms. Migara" });
  assert(!("problem" in done));
  if ("problem" in done) return;
  assert.equal(done.subject, "Smith & Co · Executive Search Agreement");
  assert.match(done.body, /Dear Ms\. Migara,/);
  assert.match(done.body, /1 month\(s\) gross salary, within 30 days\. Guarantee 90 days\./);

  const hole = coverDraft({ subject: "x", body: "Pay {{paymentDays}} and {{mysteryHole}}" }, filled());
  assert("problem" in hole && /mysteryHole/.test(hole.problem));
  const blank = coverDraft(wording, { ...filled(), paymentDays: " " });
  assert("problem" in blank && /paymentDays/.test(blank.problem), "a blank term is a hole, not an empty sentence");
});

test("the versions list: newest first, the PDF stands for a version that has both", () => {
  const f = (id: string, name: string, at: number) => ({ id, name, mime: "x", uploadedAt: at, kind: "esa_draft" });
  const rows = agreementVersions([
    f("a", "Agreement - Valtrix - v1.docx", 1),
    f("b", "Agreement - Valtrix - v1.pdf", 2),
    f("c", "Agreement - Valtrix - v2.docx", 3),
    { ...f("d", "Agreement - Valtrix - v9.pdf", 4), kind: "esa_signed" },
    f("e", "cover letter.docx", 5),
  ]);
  assert.deepEqual(rows.map((r) => [r.version, r.file.id]), [[2, "c"], [1, "b"]]);
});

test("the cover email is the person's own wording once they edit it, and never with a hole left", () => {
  const wording = { subject: "{{client}} agreement", body: "Dear {{contact}}, fee {{feeMonths}} month." };
  const standard = coverEmail(wording, filled());
  assert("subject" in standard && /1 month/.test(standard.body));

  const edited = coverEmail(wording, { ...filled(), coverSubject: "Our ESA", coverBody: "Hello, my own words." });
  assert.deepEqual(edited, { subject: "Our ESA", body: "Hello, my own words." });

  const half = coverEmail(wording, { ...filled(), coverSubject: "Our ESA", coverBody: "Dear {{contact}}," });
  assert("problem" in half, "a hole typed back in is refused");

  const blank = coverEmail(wording, { ...filled(), coverSubject: "  ", coverBody: "x" });
  assert("subject" in blank && blank.subject.includes("SAMPLE CLIENT"), "an empty edit falls back to the standard wording");
});

test("every drafted copy is the next version, so a second draft never writes over the first", () => {
  const f = (name: string, kind = "esa_draft") => ({ id: name, name, mime: "x", uploadedAt: 1, kind });
  assert.equal(nextDraftVersion([]), 1);
  assert.equal(nextDraftVersion([f("Agreement - A - v1.docx"), f("Agreement - A - v1.pdf")]), 2);
  assert.equal(nextDraftVersion([f("Agreement - A - v1.docx"), f("Agreement - A - v2.docx")]), 3);
  assert.equal(nextDraftVersion([f("Agreement - A - v7.pdf", "esa_signed")]), 1, "a signed copy is not a draft");
});
